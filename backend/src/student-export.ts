// xlsx-js-style: SheetJS yang bisa menulis font dan garis tabel (xlsx biasa tidak).
import * as XLSX from "xlsx-js-style";
import type { DisciplinePillar, StatusClearance, ViolationSeverity } from "@prisma/client";
import { disciplinePillarLabels, violationSeverityLabels } from "./points";
import type { ViolationResolution } from "./punishment";

// Ekspor Monitoring Mahasiswa (Kemahasiswaan) ke Excel/CSV. Kolom "Rekap"
// sama dengan tabel di dashboard; "Rincian Pelanggaran" sama dengan panel Rincian.

export type ExportViolation = {
  id: number;
  type: string;
  pillar: DisciplinePillar | null;
  severity: ViolationSeverity | null;
  delta: number;
  reason: string | null;
  createdAt: Date;
  laporan: { id: number; aturan: { nama: string } | null } | null;
  punishment: {
    jenis: string;
    status: string;
    batasWaktu: Date | null;
    hariDenda: number;
    totalDenda: number;
    updatedAt: Date;
  } | null;
  status: ViolationResolution;
};

export type ExportStudent = {
  nim: number;
  nama: string;
  dosenPa: { nama: string } | null;
  prodi: string;
  angkatan: number | null;
  poin: number;
  status: { label: string };
  jumlahPelanggaran: number;
  pelanggaranBelumSelesai: number;
  statusClearance: StatusClearance | null;
  pelanggaran: ExportViolation[];
};

export type ExportFormat = "xlsx" | "csv";

const clearanceLabels: Record<StatusClearance, string> = {
  CLEAR: "CLEAR",
  PENDING: "PENDING",
  BELUM_CLEAR: "BELUM CLEAR",
};

const violationTypeLabels: Record<string, string> = {
  LATE: "Terlambat",
  UNEXCUSED_ABSENCE: "Tidak hadir tanpa keterangan",
  DISCIPLINE_VIOLATION: "Pelanggaran tata tertib",
  REPORTED_VIOLATION: "Pelanggaran dari laporan",
};

const resolutionLabels: Record<ViolationResolution, string> = {
  BELUM_PUNISHMENT: "Belum diberi punishment",
  BERJALAN: "Punishment berjalan",
  TERLAMBAT: "Punishment terlambat",
  SELESAI: "Selesai · poin dipulihkan",
  DIBATALKAN: "Dibatalkan (sanggahan disetujui)",
  TANPA_PUNISHMENT: "Tercatat · tanpa punishment",
};

const punishmentTypeLabels: Record<string, string> = {
  TUGAS_EDUKATIF: "Tugas edukatif",
  REFLEKSI_TERTULIS: "Refleksi tertulis",
  KONSELING: "Coaching / konseling",
};

const unresolvedStatuses: ViolationResolution[] = ["BELUM_PUNISHMENT", "BERJALAN", "TERLAMBAT"];

type Cell = string | number;
type Table = { title: string; headers: string[]; rows: Cell[][] };

// Tanggal dicatat (waktu) ditampilkan dalam WITA; batas waktu bertipe DATE dibaca UTC.
function formatDate(value: Date | null, timeZone = "Asia/Makassar"): string {
  return value
    ? value.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone })
    : "-";
}

export function recapTable(students: ExportStudent[]): Table {
  return {
    title: "Rekap Mahasiswa",
    headers: [
      "No", "NIM", "Nama", "DPA", "Prodi", "Angkatan", "Poin", "Status Poin",
      "Jumlah Pelanggaran", "Belum Selesai", "Clearance",
    ],
    rows: students.map((student, index) => [
      index + 1,
      String(student.nim),
      student.nama,
      student.dosenPa?.nama ?? "Belum ditetapkan",
      student.prodi,
      student.angkatan ?? "-",
      student.poin,
      student.status.label,
      student.jumlahPelanggaran,
      student.pelanggaranBelumSelesai,
      student.statusClearance ? clearanceLabels[student.statusClearance] : "Belum dihitung",
    ]),
  };
}

export function violationTable(students: ExportStudent[]): Table {
  const rows: Cell[][] = [];
  for (const student of students) {
    // Urutan sama dengan panel Rincian: belum selesai dulu, lalu yang selesai.
    const ordered = [
      ...student.pelanggaran.filter((violation) => unresolvedStatuses.includes(violation.status)),
      ...student.pelanggaran.filter((violation) => !unresolvedStatuses.includes(violation.status)),
    ];
    for (const violation of ordered) {
      const punishment = violation.punishment;
      rows.push([
        rows.length + 1,
        String(student.nim),
        student.nama,
        violation.laporan?.aturan?.nama ?? violationTypeLabels[violation.type] ?? violation.type,
        violation.laporan ? `Laporan #${violation.laporan.id}` : violationTypeLabels[violation.type] ?? violation.type,
        violation.pillar ? disciplinePillarLabels[violation.pillar] : "-",
        violation.severity ? violationSeverityLabels[violation.severity] : "-",
        violation.delta,
        formatDate(violation.createdAt),
        unresolvedStatuses.includes(violation.status) ? "Belum selesai" : "Selesai",
        resolutionLabels[violation.status] ?? violation.status,
        punishment ? punishmentTypeLabels[punishment.jenis] ?? punishment.jenis : "-",
        punishment ? formatDate(punishment.batasWaktu, "UTC") : "-",
        punishment?.status === "DISETUJUI" ? formatDate(punishment.updatedAt) : "-",
        punishment && punishment.hariDenda > 0
          ? `Terlambat ${punishment.hariDenda} hari (−${punishment.totalDenda} poin)`
          : "-",
        violation.reason ?? "-",
      ]);
    }
  }
  return {
    title: "Rincian Pelanggaran",
    headers: [
      "No", "NIM", "Nama", "Pelanggaran", "Sumber", "Pilar", "Tingkat", "Poin", "Tanggal Dicatat",
      "Penyelesaian", "Status", "Punishment", "Batas Waktu", "Tanggal Selesai", "Denda", "Keterangan",
    ],
    rows,
  };
}

const thinBorder = { style: "thin", color: { rgb: "000000" } };
const cellBorder = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };
const numberHeaders = new Set(["No", "Angkatan", "Poin", "Jumlah Pelanggaran", "Belum Selesai"]);

function tableSheet(table: Table, emptyText: string) {
  const rows: Cell[][] = table.rows.length > 0 ? table.rows : [[emptyText]];
  const sheet = XLSX.utils.aoa_to_sheet([table.headers, ...rows]);
  for (const [address, cell] of Object.entries(sheet)) {
    if (address.startsWith("!")) continue;
    const { r: row, c: column } = XLSX.utils.decode_cell(address);
    const isHeader = row === 0;
    const isNumber = !isHeader && typeof cell.v === "number";
    cell.s = {
      font: { name: "Calibri", sz: 10, bold: isHeader, color: isHeader ? { rgb: "FFFFFF" } : undefined },
      fill: isHeader ? { fgColor: { rgb: "991B1B" } } : undefined,
      alignment: {
        horizontal: isHeader || isNumber || numberHeaders.has(table.headers[column]) ? "center" : "left",
        vertical: "center",
        wrapText: true,
      },
      border: cellBorder,
    };
  }
  if (table.rows.length === 0) {
    sheet["!merges"] = [{ s: { r: 1, c: 0 }, e: { r: 1, c: table.headers.length - 1 } }];
  }
  sheet["!cols"] = table.headers.map((header, column) => ({
    wch: Math.min(
      50,
      Math.max(header.length, ...table.rows.map((row) => String(row[column] ?? "").length)) + 2,
    ),
  }));
  // Baris judul tetap terlihat saat menggulir.
  sheet["!freeze"] = { xSplit: 0, ySplit: 1 };
  return sheet;
}

export function buildStudentExportWorkbook(students: ExportStudent[]): Buffer {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, tableSheet(recapTable(students), "Tidak ada mahasiswa."), "Rekap Mahasiswa");
  XLSX.utils.book_append_sheet(
    workbook,
    tableSheet(violationTable(students), "Tidak ada pelanggaran."),
    "Rincian Pelanggaran",
  );
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}

// Titik koma: pemisah daftar bawaan Excel berbahasa Indonesia. Teks diawali
// = + - @ diberi tanda kutip tunggal agar tidak dijalankan sebagai rumus.
function csvCell(value: Cell): string {
  if (typeof value === "number") return String(value);
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[;"\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

function csvSection(table: Table): string[] {
  return [table.title, ...[table.headers, ...table.rows].map((row) => row.map(csvCell).join(";"))];
}

export function buildStudentExportCsv(students: ExportStudent[]): Buffer {
  const lines = [...csvSection(recapTable(students)), "", ...csvSection(violationTable(students))];
  // BOM agar Excel membaca huruf non-ASCII (mis. "−") sebagai UTF-8.
  return Buffer.from(`﻿${lines.join("\r\n")}\r\n`, "utf8");
}

export function exportContentType(format: ExportFormat): string {
  return format === "xlsx"
    ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    : "text/csv; charset=utf-8";
}

// Nama file aman untuk header Content-Disposition (tanpa karakter khusus).
export function exportFileName(label: string, format: ExportFormat, today = new Date()): string {
  const date = new Date(today.getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const safeLabel = label.replace(/[^A-Za-z0-9 _-]+/g, "").replace(/\s+/g, "_").slice(0, 80) || "Mahasiswa";
  return `Rekap_${safeLabel}_${date}.${format}`;
}
