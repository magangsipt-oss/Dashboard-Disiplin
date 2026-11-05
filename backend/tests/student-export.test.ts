import assert from "node:assert/strict";
import test from "node:test";
import * as XLSX from "xlsx-js-style";
import {
  buildStudentExportCsv,
  buildStudentExportWorkbook,
  exportFileName,
  recapTable,
  violationTable,
  type ExportStudent,
} from "../src/student-export";

const student: ExportStudent = {
  nim: 23401024,
  nama: "Abin Nabawi",
  dosenPa: { nama: "Hamim Rachman, S.T., M.T." },
  prodi: "Teknologi Rekayasa Logistik",
  angkatan: 2023,
  poin: 85,
  status: { label: "Baik" },
  jumlahPelanggaran: 2,
  pelanggaranBelumSelesai: 1,
  statusClearance: "BELUM_CLEAR",
  pelanggaran: [
    {
      id: 1,
      type: "LATE",
      pillar: "WAKTU",
      severity: "RINGAN",
      delta: -5,
      reason: "=HYPERLINK(\"x\")",
      createdAt: new Date("2026-10-01T02:00:00.000Z"),
      laporan: null,
      punishment: null,
      status: "TANPA_PUNISHMENT",
    },
    {
      id: 2,
      type: "REPORTED_VIOLATION",
      pillar: "TATA_TERTIB",
      severity: "SEDANG",
      delta: -10,
      reason: "Merokok; di area kampus",
      createdAt: new Date("2026-10-20T02:00:00.000Z"),
      laporan: { id: 7, aturan: { nama: "Merokok di area kampus" } },
      punishment: {
        jenis: "REFLEKSI_TERTULIS",
        status: "DIMINTA",
        batasWaktu: new Date("2026-11-05T00:00:00.000Z"),
        hariDenda: 2,
        totalDenda: 4,
        updatedAt: new Date("2026-10-21T02:00:00.000Z"),
      },
      status: "TERLAMBAT",
    },
  ],
};

test("rekap mengikuti kolom tabel Monitoring Mahasiswa", () => {
  const table = recapTable([student, { ...student, nim: 1, dosenPa: null, angkatan: null, statusClearance: null }]);
  assert.deepEqual(table.headers, [
    "No", "NIM", "Nama", "DPA", "Prodi", "Angkatan", "Poin", "Status Poin",
    "Jumlah Pelanggaran", "Belum Selesai", "Clearance",
  ]);
  assert.deepEqual(table.rows[0], [
    1, "23401024", "Abin Nabawi", "Hamim Rachman, S.T., M.T.", "Teknologi Rekayasa Logistik",
    2023, 85, "Baik", 2, 1, "BELUM CLEAR",
  ]);
  assert.deepEqual(table.rows[1].slice(3, 6), ["Belum ditetapkan", "Teknologi Rekayasa Logistik", "-"]);
  assert.equal(table.rows[1][10], "Belum dihitung");
});

test("rincian menaruh pelanggaran belum selesai lebih dulu", () => {
  const { rows } = violationTable([student]);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0].slice(0, 11), [
    1, "23401024", "Abin Nabawi", "Merokok di area kampus", "Laporan #7",
    "Disiplin Tata Tertib dan Etika", "Sedang", -10, "20 Oktober 2026", "Belum selesai", "Punishment terlambat",
  ]);
  assert.deepEqual(rows[0].slice(11, 15), ["Refleksi tertulis", "5 November 2026", "-", "Terlambat 2 hari (−4 poin)"]);
  assert.deepEqual(rows[1].slice(3, 5), ["Terlambat", "Terlambat"]);
  assert.equal(rows[1][9], "Selesai");
});

test("CSV memakai titik koma, BOM, dan menetralkan rumus", () => {
  const csv = buildStudentExportCsv([student]).toString("utf8");
  assert.ok(csv.startsWith("﻿Rekap Mahasiswa\r\nNo;NIM;Nama;DPA;"));
  assert.match(csv, /\r\n1;23401024;Abin Nabawi;Hamim Rachman, S\.T\., M\.T\.;/);
  assert.match(csv, /\r\n\r\nRincian Pelanggaran\r\n/);
  assert.match(csv, /"Merokok; di area kampus"/);
  assert.match(csv, /;"'=HYPERLINK\(""x""\)"\r\n/);
  assert.match(csv, /;-10;/);
});

test("Excel berisi sheet rekap dan rincian", () => {
  const workbook = XLSX.read(buildStudentExportWorkbook([student]), { type: "buffer" });
  assert.deepEqual(workbook.SheetNames, ["Rekap Mahasiswa", "Rincian Pelanggaran"]);
  const recap = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets["Rekap Mahasiswa"]);
  assert.equal(recap[0].NIM, "23401024");
  assert.equal(recap[0].Poin, 85);
  const details = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets["Rincian Pelanggaran"]);
  assert.equal(details.length, 2);
  // Isi teks berbahaya tetap teks, bukan rumus.
  assert.equal(workbook.Sheets["Rincian Pelanggaran"].P3.f, undefined);

  const empty = XLSX.read(buildStudentExportWorkbook([{ ...student, pelanggaran: [] }]), { type: "buffer" });
  assert.equal(empty.Sheets["Rincian Pelanggaran"].A2.v, "Tidak ada pelanggaran.");
});

test("nama file ekspor aman untuk header unduhan", () => {
  const now = new Date("2026-11-03T20:00:00.000Z"); // 4 Nov 04:00 WITA
  assert.equal(exportFileName("23401024_Abin Nabawi", "xlsx", now), "Rekap_23401024_Abin_Nabawi_2026-11-04.xlsx");
  assert.equal(exportFileName('Nama "aneh"/\\\r\n', "csv", now), "Rekap_Nama_aneh_2026-11-04.csv");
});
