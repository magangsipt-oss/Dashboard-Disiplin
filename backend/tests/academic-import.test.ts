import assert from "node:assert/strict";
import test from "node:test";
import * as XLSX from "xlsx";
import {
  AcademicImportValidationError,
  parseAcademicAttendanceFile,
  parseAdvisorAssignmentFile,
} from "../src/academic-import";

function makeWorkbookBuffer(rows: unknown[][]): Buffer {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet(rows),
    "Data",
  );
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}

test("attendance import reads the supplied CSV columns", () => {
  const csv = Buffer.from(
    [
      "No,Mata_Kuliah,Kelas,NIM,Nama_Mahasiswa,Jumlah_Kehadiran",
      '1,"Pemrograman, Dasar",TI-1,12345,"Budi Santoso",14',
    ].join("\n"),
  );

  assert.deepEqual(parseAcademicAttendanceFile(csv, "absensi.csv"), [
    {
      mataKuliah: "Pemrograman, Dasar",
      kelas: "TI-1",
      nim: 12345,
      namaMahasiswa: "Budi Santoso",
      jumlahKehadiran: 14,
    },
  ]);
});

test("attendance import rejects conflicting names for the same NIM", () => {
  const csv = Buffer.from(
    [
      "No,Mata_Kuliah,Kelas,NIM,Nama_Mahasiswa,Jumlah_Kehadiran",
      '1,"Pemrograman Dasar",TI-1,12345,"Budi Santoso",14',
      '2,"Pemrograman Dasar",TI-1,12345,"Budi Santoso Jr.",13',
    ].join("\n"),
  );

  assert.throws(
    () => parseAcademicAttendanceFile(csv, "absensi.csv"),
    (error: unknown) =>
      error instanceof AcademicImportValidationError &&
      error.message.includes("Gunakan NIM sebagai identitas utama"),
  );
});

test("advisor assignment import reads NIM, Program Studi, and NIP from an Excel workbook", () => {
  const workbook = makeWorkbookBuffer([
    ["NIM", "Program Studi", "NIP"],
    [12345, "Teknologi Rekayasa Logistik", "198701012010011001"],
  ]);

  assert.deepEqual(
    parseAdvisorAssignmentFile(workbook, "pembagian.xlsx"),
    [
      {
        nim: 12345,
        programStudi: "Teknologi Rekayasa Logistik",
        nip: "198701012010011001",
      },
    ],
  );
});

test("attendance import rejects missing required columns", () => {
  const csv = Buffer.from("Mata_Kuliah,Kelas,NIM\nMatematika,A,12345");

  assert.throws(
    () => parseAcademicAttendanceFile(csv, "absensi.csv"),
    (error: unknown) =>
      error instanceof AcademicImportValidationError &&
      error.message.includes("nama_mahasiswa"),
  );
});

test("advisor assignment import rejects duplicate student NIMs", () => {
  const csv = Buffer.from(
    "NIM,Program Studi,NIP\n12345,TR Logistik,198701012010011001\n12345,TR Logistik,198901012010011002",
  );

  assert.throws(
    () => parseAdvisorAssignmentFile(csv, "pembagian.csv"),
    (error: unknown) =>
      error instanceof AcademicImportValidationError &&
      error.message.includes("muncul lebih dari sekali"),
  );
});

test("advisor assignment import requires Program Studi", () => {
  const csv = Buffer.from("NIM,NIP\n12345,198701012010011001");

  assert.throws(
    () => parseAdvisorAssignmentFile(csv, "pembagian.csv"),
    (error: unknown) =>
      error instanceof AcademicImportValidationError &&
      error.message.includes("Program Studi"),
  );
});
