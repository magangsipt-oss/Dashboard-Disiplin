import { Prisma, StatusPembinaan } from "@prisma/client";
import { database } from "./db";
import {
  countExtraPunishmentsDue,
  countPunishmentPenaltyDays,
  extraPunishmentDeadlineDays,
  punishmentLateDaysPerExtra,
  punishmentPenaltyPerDay,
} from "./points";
import { recordPointChanges } from "./point-ledger";

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

// Satu pelanggaran bisa punya punishment asal dan tambahan. Yang mewakili:
// punishment terlambat yang belum disetujui, lalu yang belum disetujui, lalu
// punishment asal (semua sudah disetujui).
export function representativePunishment<
  T extends { status: StatusPembinaan; batasWaktu: Date | null; hariDenda: number },
>(punishments: T[], today = todayInCampusTime()): T | null {
  const unfinished = punishments.filter((item) => item.status !== StatusPembinaan.DISETUJUI);
  return (
    unfinished.find((item) => isPunishmentLate(item, today)) ??
    unfinished[0] ??
    punishments[0] ??
    null
  );
}

export const unresolvedViolationStatuses: ViolationResolution[] = ["BELUM_PUNISHMENT", "BERJALAN", "TERLAMBAT"];

// Seluruh pelanggaran (pengurangan poin) per mahasiswa beserta status
// penyelesaiannya, tanpa denda keterlambatan punishment yang tercatat
// terpisah pada punishment-nya. Tanpa studentIds = semua mahasiswa.
export async function listViolationsWithResolution(
  client: Prisma.TransactionClient,
  studentIds?: number[],
  today = todayInCampusTime(),
) {
  const violations = await client.pointChange.findMany({
    where: {
      ...(studentIds ? { studentId: { in: studentIds } } : {}),
      delta: { lt: 0 },
      type: { in: ["LATE", "UNEXCUSED_ABSENCE", "DISCIPLINE_VIOLATION", "REPORTED_VIOLATION"] },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      studentId: true,
      type: true,
      pillar: true,
      severity: true,
      delta: true,
      reason: true,
      createdAt: true,
      laporan: {
        select: { id: true, status: true, tanggalKejadian: true, aturan: { select: { nama: true } } },
      },
      pembinaans: {
        orderBy: { createdAt: "asc" },
        select: {
          jenis: true,
          status: true,
          batasWaktu: true,
          hariDenda: true,
          totalDenda: true,
          updatedAt: true,
        },
      },
      sanggahans: { where: { status: "DISETUJUI" }, take: 1, select: { id: true } },
    },
  });
  const byStudent = new Map<number, Array<Omit<(typeof violations)[number], "studentId" | "sanggahans" | "pembinaans"> & {
    punishment: (typeof violations)[number]["pembinaans"][number] | null;
    status: ViolationResolution;
  }>>();
  for (const { studentId, sanggahans, pembinaans, laporan, ...violation } of violations) {
    const punishment = representativePunishment(pembinaans, today);
    const list = byStudent.get(studentId) ?? [];
    list.push({
      ...violation,
      laporan,
      punishment,
      status: getViolationResolution(
        { type: violation.type, sanggahanDisetujui: sanggahans.length > 0, punishment },
        today,
      ),
    });
    byStudent.set(studentId, list);
  }
  return byStudent;
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

  const laporanId = training.perubahanPoin.laporan?.id ?? null;
  const [change] = await recordPointChanges(
    transaction,
    [
      {
        studentId: training.studentId,
        type: "PUNISHMENT_PENALTY",
        delta: -days * punishmentPenaltyPerDay,
        referensiLaporanId: laporanId,
        reason: `Sanksi punishment laporan #${laporanId ?? training.id} belum ditindaklanjuti: ${days} hari × ${punishmentPenaltyPerDay} poin`,
        recordedByIdentity: "SISTEM",
      },
    ],
    { skipUnchanged: true },
  );
  const appliedDelta = change.appliedDelta;
  await transaction.pembinaan.update({
    where: { id: training.id },
    data: {
      dendaDihitungSampai: today,
      hariDenda: { increment: days },
      totalDenda: { increment: Math.abs(appliedDelta) },
    },
  });
  await transaction.pemberitahuan.create({
    data: {
      studentId: training.studentId,
      judul: "Poin dipotong: punishment belum ditindaklanjuti",
      isi: `Batas waktu punishment telah lewat ${training.hariDenda + days} hari. Poin berkurang ${Math.abs(appliedDelta)} hari ini dan terus berkurang ${punishmentPenaltyPerDay} poin per hari sampai bukti penyelesaian dikirim. Setiap ${punishmentLateDaysPerExtra} hari keterlambatan menambah 1 punishment.`,
      tautanTab: "tindak-lanjut",
    },
  });

  const extras = countExtraPunishmentsDue(training.hariDenda, training.hariDenda + days);
  if (extras > 0) {
    const batasWaktu = new Date(today.getTime() + extraPunishmentDeadlineDays * 24 * 60 * 60 * 1000);
    await transaction.pembinaan.createMany({
      data: Array.from({ length: extras }, () => ({
        perubahanPoinId: training.perubahanPoinId,
        studentId: training.studentId,
        pembinaanAsalId: training.id,
        jenis: training.jenis,
        instruksi: training.instruksi,
        batasWaktu,
      })),
    });
    await transaction.pemberitahuan.create({
      data: {
        studentId: training.studentId,
        judul: "Punishment tambahan diberikan",
        isi: `Punishment laporan #${laporanId ?? training.id} terlambat ${training.hariDenda + days} hari, sehingga Anda mendapat ${extras} punishment tambahan. Batas waktu: ${batasWaktu.toLocaleDateString("id-ID", { timeZone: "UTC" })}. Poin pelanggaran baru dipulihkan setelah semua punishment disetujui Dosen PA.`,
        tautanTab: "tindak-lanjut",
      },
    });
  }
  return days;
}

// Punishment yang belum disetujui untuk satu pelanggaran (asal maupun tambahan).
export async function countUnfinishedPunishments(
  transaction: Prisma.TransactionClient,
  perubahanPoinId: number,
): Promise<number> {
  return transaction.pembinaan.count({
    where: { perubahanPoinId, status: { not: StatusPembinaan.DISETUJUI } },
  });
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
