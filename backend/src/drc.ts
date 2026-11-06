import type { DisciplinePillar, JenisKegiatanDrc, Prisma } from "@prisma/client";
import { disciplinePillarLabels } from "./points";

// DLS = Discipline Learning System: kegiatan wajib mahasiswa setiap awal semester.
export const drcTypeLabels: Record<JenisKegiatanDrc, string> = {
  SEMINAR: "Seminar",
  KEGIATAN_LAIN: "Kegiatan",
};

export type DrcTarget = { targetProdi: string[]; targetAngkatan: number[] };

// Prodi mahasiswa berasal dari file upload, jadi dicocokkan tanpa beda huruf/spasi.
function normalizeProdi(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

// Pilihan prodi diambil dari data mahasiswa; varian huruf/spasi digabung jadi satu.
export function uniqueProdiOptions(values: string[]): string[] {
  const byKey = new Map<string, string>();
  for (const value of values) {
    const label = value.trim().replace(/\s+/g, " ");
    if (label && !byKey.has(normalizeProdi(label))) byKey.set(normalizeProdi(label), label);
  }
  return [...byKey.values()].sort((a, b) => a.localeCompare(b, "id"));
}

// Array target kosong berarti semua prodi / semua angkatan. Database hanya
// menyaring angkatan; prodi dicocokkan lewat isDrcTargetedTo karena SQL tidak
// bisa mengabaikan spasi berlebih dari file upload.
export function drcAngkatanWhere({ targetAngkatan }: DrcTarget): Prisma.MahasiswaWhereInput {
  return targetAngkatan.length > 0 ? { angkatan: { in: targetAngkatan } } : {};
}

export function isDrcTargetedTo(
  { targetProdi, targetAngkatan }: DrcTarget,
  student: { jurusan: string; angkatan: number | null },
): boolean {
  const prodiMatches =
    targetProdi.length === 0 ||
    targetProdi.some((prodi) => normalizeProdi(prodi) === normalizeProdi(student.jurusan));
  const angkatanMatches =
    targetAngkatan.length === 0 || (student.angkatan !== null && targetAngkatan.includes(student.angkatan));
  return prodiMatches && angkatanMatches;
}

export function describeDrcTarget({ targetProdi, targetAngkatan }: DrcTarget): string {
  const prodi = targetProdi.length > 0 ? `Prodi ${targetProdi.join(", ")}` : "Semua prodi";
  const angkatan =
    targetAngkatan.length > 0
      ? `angkatan ${[...targetAngkatan].sort((a, b) => a - b).join(", ")}`
      : "semua angkatan";
  return `${prodi}; ${angkatan}`;
}

export type DrcActivityText = DrcTarget & {
  judul: string;
  jenis: JenisKegiatanDrc;
  semester: string;
  tanggal: Date;
  jamMulai: string;
  jamSelesai: string;
  lokasi: string;
  tema: DisciplinePillar[];
  deskripsi: string | null;
};

// Kolom tanggal bertipe DATE disimpan pukul 00:00 UTC, jadi diformat dalam UTC.
export function formatDrcDate(date: Date): string {
  return date.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

const NOTIFICATION_TITLE_LIMIT = 200;
const NOTIFICATION_BODY_LIMIT = 1000;

function truncate(text: string, limit: number): string {
  return text.length <= limit ? text : `${text.slice(0, limit - 1).trimEnd()}…`;
}

export type DrcNotificationKind = "BARU" | "DIUBAH" | "DIBATALKAN";

const titlePrefixes: Record<DrcNotificationKind, string> = {
  BARU: "Kegiatan DLS Wajib",
  DIUBAH: "Perubahan Kegiatan DLS",
  DIBATALKAN: "Kegiatan DLS Dibatalkan",
};

const openingLines: Record<DrcNotificationKind, (activity: DrcActivityText) => string> = {
  BARU: (activity) =>
    `Kemahasiswaan menjadwalkan ${drcTypeLabels[activity.jenis].toLowerCase()} DLS (Discipline Learning System) semester ${activity.semester}. Kegiatan ini WAJIB Anda ikuti.`,
  DIUBAH: (activity) =>
    `Terdapat perubahan informasi ${drcTypeLabels[activity.jenis].toLowerCase()} DLS (Discipline Learning System) semester ${activity.semester}. Mohon perhatikan detail terbaru berikut.`,
  DIBATALKAN: (activity) =>
    `${drcTypeLabels[activity.jenis]} DLS (Discipline Learning System) semester ${activity.semester} berikut dibatalkan. Tunggu informasi jadwal pengganti dari Kemahasiswaan.`,
};

// Isi Pemberitahuan (dan email) untuk seluruh mahasiswa; dibatasi panjang kolom.
export function drcNotification(kind: DrcNotificationKind, activity: DrcActivityText) {
  const lines = [
    openingLines[kind](activity),
    "",
    `Kegiatan : ${activity.judul}`,
    `Tanggal  : ${formatDrcDate(activity.tanggal)}`,
    `Waktu    : ${activity.jamMulai}–${activity.jamSelesai} WITA`,
    `Lokasi   : ${activity.lokasi}`,
    `Tema     : ${activity.tema.map((pillar) => disciplinePillarLabels[pillar]).join(", ")}`,
    `Peserta  : ${describeDrcTarget(activity)}`,
  ];
  if (kind !== "DIBATALKAN" && activity.deskripsi) {
    lines.push("", activity.deskripsi);
  }
  return {
    judul: truncate(`${titlePrefixes[kind]}: ${activity.judul}`, NOTIFICATION_TITLE_LIMIT),
    isi: truncate(lines.join("\n"), NOTIFICATION_BODY_LIMIT),
  };
}

const WITA_OFFSET_MS = 8 * 60 * 60 * 1000;

// Tambahan waktu unggah bukti setelah kegiatan selesai.
export const DRC_EVIDENCE_GRACE_MINUTES = 30;

type DrcSchedule = { tanggal: Date; jamMulai: string; jamSelesai: string };

// Tanggal (DATE, 00:00 UTC) + jam "HH:MM" WITA menjadi waktu sebenarnya.
function witaDateTime(tanggal: Date, clock: string): Date {
  const [hours, minutes] = clock.split(":").map(Number);
  return new Date(tanggal.getTime() + (hours * 60 + minutes) * 60_000 - WITA_OFFSET_MS);
}

// Unggah bukti dibuka saat kegiatan mulai, ditutup 30 menit setelah kegiatan selesai.
export function drcEvidenceWindow(activity: DrcSchedule): { dibuka: Date; ditutup: Date } {
  return {
    dibuka: witaDateTime(activity.tanggal, activity.jamMulai),
    ditutup: new Date(
      witaDateTime(activity.tanggal, activity.jamSelesai).getTime() + DRC_EVIDENCE_GRACE_MINUTES * 60_000,
    ),
  };
}

export type DrcEvidenceStatus = "BELUM_DIBUKA" | "DIBUKA" | "DITUTUP";

export function drcEvidenceStatus(activity: DrcSchedule, now = new Date()): DrcEvidenceStatus {
  const { dibuka, ditutup } = drcEvidenceWindow(activity);
  if (now < dibuka) return "BELUM_DIBUKA";
  return now <= ditutup ? "DIBUKA" : "DITUTUP";
}

// Kegiatan dianggap selesai setelah waktu unggah bukti ditutup.
export function isDrcActivityPast(activity: DrcSchedule, now = new Date()): boolean {
  return drcEvidenceStatus(activity, now) === "DITUTUP";
}
