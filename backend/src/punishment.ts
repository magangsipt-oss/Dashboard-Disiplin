import { Prisma, StatusPembinaan } from "@prisma/client";
import { database } from "./db";
import {
  calculatePointChangeForDelta,
  countPunishmentPenaltyDays,
  punishmentPenaltyPerDay,
  type PointChangeType,
} from "./points";

// Kampus berada di Berau (WITA, UTC+8): pergantian hari denda mengikuti WITA.
const campusUtcOffsetMs = 8 * 60 * 60 * 1000;
const penaltyJobIntervalMs = 60 * 60 * 1000;

// Punishment yang masih menjadi kewajiban mahasiswa. Saat DIKIRIM, bukti sedang
// diperiksa Dosen PA sehingga denda dijeda.
export const openPunishmentStatuses: StatusPembinaan[] = [StatusPembinaan.DIMINTA, StatusPembinaan.DITOLAK];

export function todayInCampusTime(now = new Date()): Date {
  const local = new Date(now.getTime() + campusUtcOffsetMs);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()));
}

// Terlambat: masih menjadi kewajiban setelah batas waktu lewat, atau pernah
// didenda (bukti dikirim/disetujui setelah batas waktu).
export function isPunishmentLate(
  punishment: { status: StatusPembinaan; batasWaktu: Date | null; hariDenda: number },
  today = todayInCampusTime(),
): boolean {
  if (punishment.hariDenda > 0) return true;
  return (
    openPunishmentStatuses.includes(punishment.status) &&
    punishment.batasWaktu !== null &&
    punishment.batasWaktu < today
  );
}

export type ViolationResolution =
  | "DIBATALKAN"
  | "BELUM_PUNISHMENT"
  | "BERJALAN"
  | "TERLAMBAT"
  | "SELESAI"
  | "TANPA_PUNISHMENT";

// Status penyelesaian satu pelanggaran (pengurangan poin). Hanya pelanggaran
// dari laporan yang punya alur punishment; pengurangan lain (mis. presensi)
// cukup tercatat.
export function getViolationResolution(
  violation: {
    type: string;
    sanggahanDisetujui: boolean;
    punishment: { status: StatusPembinaan; batasWaktu: Date | null; hariDenda: number } | null;
  },
  today = todayInCampusTime(),
): ViolationResolution {
  if (violation.sanggahanDisetujui) return "DIBATALKAN";
  if (violation.type !== "REPORTED_VIOLATION") return "TANPA_PUNISHMENT";
  if (!violation.punishment) return "BELUM_PUNISHMENT";
  if (violation.punishment.status === StatusPembinaan.DISETUJUI) return "SELESAI";
  return isPunishmentLate(violation.punishment, today) ? "TERLAMBAT" : "BERJALAN";
}

// Menghitung dan mencatat denda yang belum dibebankan untuk satu punishment.
// Dipanggil oleh job berkala dan sebelum mahasiswa mengirim bukti, agar hari
// yang sudah lewat tetap terhitung walau job belum berjalan.
export async function settlePunishmentPenalty(
  transaction: Prisma.TransactionClient,
  trainingId: number,
  today = todayInCampusTime(),
): Promise<number> {
  const training = await transaction.pembinaan.findFirst({
    where: {
      id: trainingId,
      status: { in: openPunishmentStatuses },
      batasWaktu: { lt: today },
    },
    include: {
      student: { select: { pointScore: true } },
      perubahanPoin: { select: { laporan: { select: { id: true } } } },
    },
  });
  if (!training?.batasWaktu) return 0;

  const days = countPunishmentPenaltyDays(
    training.batasWaktu,
    training.dendaDihitungSampai,
    today,
  );
  if (days === 0) return 0;

  const change = calculatePointChangeForDelta(
    training.student.pointScore,
    -days * punishmentPenaltyPerDay,
  );
  await transaction.pembinaan.update({
    where: { id: training.id },
    data: {
      dendaDihitungSampai: today,
      hariDenda: { increment: days },
      totalDenda: { increment: Math.abs(change.delta) },
    },
  });
  if (change.delta !== 0) {
    await transaction.mahasiswa.update({
      where: { id: training.studentId },
      data: { pointScore: change.score },
    });
    await transaction.pointChange.create({
      data: {
        studentId: training.studentId,
        type: "PUNISHMENT_PENALTY" as PointChangeType,
        delta: change.delta,
        scoreAfter: change.score,
        reason: `Sanksi punishment laporan #${training.perubahanPoin.laporan?.id ?? training.id} belum ditindaklanjuti: ${days} hari × ${punishmentPenaltyPerDay} poin`,
        recordedByIdentity: "SISTEM",
      },
    });
  }
  await transaction.pemberitahuan.create({
    data: {
      studentId: training.studentId,
      judul: "Poin dipotong: punishment belum ditindaklanjuti",
      isi: `Batas waktu punishment telah lewat ${training.hariDenda + days} hari. Poin berkurang ${Math.abs(change.delta)} hari ini dan terus berkurang ${punishmentPenaltyPerDay} poin per hari sampai bukti penyelesaian dikirim.`,
      tautanTab: "tindak-lanjut",
    },
  });
  return days;
}

export async function applyOverduePunishmentPenalties(
  today = todayInCampusTime(),
): Promise<number> {
  const overdue = await database.pembinaan.findMany({
    where: {
      status: { in: openPunishmentStatuses },
      batasWaktu: { lt: today },
      OR: [{ dendaDihitungSampai: null }, { dendaDihitungSampai: { lt: today } }],
    },
    select: { id: true },
  });
  let settled = 0;
  for (const { id } of overdue) {
    try {
      const days = await database.$transaction(
        (transaction) => settlePunishmentPenalty(transaction, id, today),
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      if (days > 0) settled += 1;
    } catch (error) {
      console.error(`Gagal menghitung denda punishment #${id}:`, error);
    }
  }
  return settled;
}

export function startPunishmentPenaltyJob(): NodeJS.Timeout {
  const run = () => {
    applyOverduePunishmentPenalties()
      .then((settled) => {
        if (settled > 0) console.log(`Denda punishment dicatat untuk ${settled} mahasiswa.`);
      })
      .catch((error) => console.error("Job denda punishment gagal:", error));
  };
  run();
  return setInterval(run, penaltyJobIntervalMs);
}
