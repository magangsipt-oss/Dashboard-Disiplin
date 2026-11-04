import type { DisciplinePillar, JenisKegiatanDrc, Prisma } from "@prisma/client";
import { disciplinePillarLabels } from "./points";

// DRC = Disiplin Refresh Competency: kegiatan wajib mahasiswa setiap awal semester.
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
  BARU: "Kegiatan DRC Wajib",
  DIUBAH: "Perubahan Kegiatan DRC",
  DIBATALKAN: "Kegiatan DRC Dibatalkan",
};

const openingLines: Record<DrcNotificationKind, (activity: DrcActivityText) => string> = {
  BARU: (activity) =>
    `Kemahasiswaan menjadwalkan ${drcTypeLabels[activity.jenis].toLowerCase()} DRC (Disiplin Refresh Competency) semester ${activity.semester}. Kegiatan ini WAJIB Anda ikuti.`,
  DIUBAH: (activity) =>
    `Terdapat perubahan informasi ${drcTypeLabels[activity.jenis].toLowerCase()} DRC (Disiplin Refresh Competency) semester ${activity.semester}. Mohon perhatikan detail terbaru berikut.`,
  DIBATALKAN: (activity) =>
    `${drcTypeLabels[activity.jenis]} DRC (Disiplin Refresh Competency) semester ${activity.semester} berikut dibatalkan. Tunggu informasi jadwal pengganti dari Kemahasiswaan.`,
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

function todayWita(now: Date): string {
  return new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

// Kegiatan dianggap sudah lewat setelah tanggalnya berakhir (zona WITA, UTC+8).
export function isDrcActivityPast(tanggal: Date, now = new Date()): boolean {
  return tanggal.toISOString().slice(0, 10) < todayWita(now);
}

// Bukti kehadiran bisa diunggah mulai hari pelaksanaan (zona WITA).
export function canSubmitDrcEvidence(tanggal: Date, now = new Date()): boolean {
  return tanggal.toISOString().slice(0, 10) <= todayWita(now);
}
