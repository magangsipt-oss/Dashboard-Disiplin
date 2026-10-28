import assert from "node:assert/strict";
import test from "node:test";
import * as XLSX from "xlsx";
import { isValidAttendancePreviewRow } from "../src/academic-files";
import { academicTemplates, buildTemplateWorkbook } from "../src/academic-templates";
import {
  AcademicImportValidationError,
  parseAcademicAttendanceFile,
  parseAdvisorAssignmentFile,
  parseNewLecturerImportFile,
  parseNewStudentImportFile,
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

test("attendance import reads the official Tamplate Absensi layout", () => {
  // Kolom "Kehadiran" sengaja ditaruh sebelum "Jumlah Kehadiran" untuk menguji prioritas alias.
  const rows = parseAcademicAttendanceFile(
    makeWorkbookBuffer([
      ["NO", "Matakuliah", "Kelas", "NIM", "Nama Mahasiswa", "Kehadiran", "Jumlah Kehadiran", "Sakit", "Ijin", "Alpa"],
      [1, "Kepelabuhan", "SBC2005-1", 23401024, "Abin Nabawi", 9, 12, 1, 1, 2],
    ]),
    "Tamplate Absensi.xlsx",
  );

  assert.equal(rows.length, 1);
  assert.equal(rows[0].mataKuliah, "Kepelabuhan");
  assert.equal(rows[0].jumlahKehadiran, 12);
  assert.equal(rows[0].sakit, 1);
  assert.equal(rows[0].ijin, 1);
  assert.equal(rows[0].alpa, 2);
});

test("student import reads the official Tamplate Mahasiswa layout", () => {
  const rows = parseNewStudentImportFile(
    makeWorkbookBuffer([
      ["No.", "NIM", "Nama Lengkap", "Program Studi", "Angkatan", "Nama SMTA", "Email", "No Handphone", "Kata Sandi"],
      ["1", "24401001", "Haura Nurhaliza", "Teknologi Rekayasa Logistik", "2024", "SMAN 4 BERAU", "haura@contoh.ac.id", "081234567890", "GantiSandi123"],
    ]),
    "Tamplate Mahasiswa.xls",
  );

  assert.deepEqual(rows, [
    {
      nim: 24401001,
      nama: "Haura Nurhaliza",
      jurusan: "Teknologi Rekayasa Logistik",
      password: "GantiSandi123",
      email: "haura@contoh.ac.id",
      noHandphone: "081234567890",
      angkatan: 2024,
      namaSmta: "SMAN 4 BERAU",
    },
  ]);
});

test("every generated template is accepted by its own import parser", () => {
  const parsers = {
    attendance: parseAcademicAttendanceFile,
    students: parseNewStudentImportFile,
    lecturers: parseNewLecturerImportFile,
    "advisor-assignments": parseAdvisorAssignmentFile,
  } as const;
  assert.deepEqual(Object.keys(academicTemplates).sort(), Object.keys(parsers).sort());

  for (const [category, parse] of Object.entries(parsers)) {
    const template = academicTemplates[category];
    const rows = parse(buildTemplateWorkbook(template), template.fileName);
    assert.equal(rows.length, template.rows.length, category);
  }

  // NUPTK 16 digit dan nol di depan No Handphone harus utuh.
  const [lecturer] = parseNewLecturerImportFile(
    buildTemplateWorkbook(academicTemplates.lecturers),
    "Template Dosen.xlsx",
  );
  assert.equal(lecturer.nuptk, 9954763664230202n);
  const [student] = parseNewStudentImportFile(
    buildTemplateWorkbook(academicTemplates.students),
    "Template Mahasiswa.xlsx",
  );
  assert.equal(student.noHandphone, "081234567890");
});

test("attendance preview skips rows that only contain placeholders or incomplete records", () => {
  const headers = [
    "No",
    "MataKuliah",
    "Kelas",
    "NIM",
    "Nama Mahasiswa",
    "Jumlah Kehadiran",
  ];

  assert.equal(
    isValidAttendancePreviewRow(headers, [
      "2",
      "Elektronika",
      "-",
      "-",
      "-",
      "-",
    ]),
    false,
  );
  assert.equal(
    isValidAttendancePreviewRow(headers, [
      "1",
      "Elektronika",
      "SBC2005-1",
      "23409901",
      "Abin Nabawi",
      "0",
    ]),
    true,
  );
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

test("advisor assignment import reads NIM, Program Studi, and NUPTK from an Excel workbook", () => {
  const workbook = makeWorkbookBuffer([
    ["NIM", "Program Studi", "NUPTK"],
    [12345, "Teknologi Rekayasa Logistik", "198701012010011001"],
  ]);

  assert.deepEqual(
    parseAdvisorAssignmentFile(workbook, "pembagian.xlsx"),
    [
      {
        nim: 12345,
        programStudi: "Teknologi Rekayasa Logistik",
        nuptk: "198701012010011001",
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
    "NIM,Program Studi,NUPTK\n12345,TR Logistik,198701012010011001\n12345,TR Logistik,198901012010011002",
  );

  assert.throws(
    () => parseAdvisorAssignmentFile(csv, "pembagian.csv"),
    (error: unknown) =>
      error instanceof AcademicImportValidationError &&
      error.message.includes("muncul lebih dari sekali"),
  );
});

test("advisor assignment import requires Program Studi", () => {
  const csv = Buffer.from("NIM,NUPTK\n12345,198701012010011001");

  assert.throws(
    () => parseAdvisorAssignmentFile(csv, "pembagian.csv"),
    (error: unknown) =>
      error instanceof AcademicImportValidationError &&
      error.message.includes("Program Studi"),
  );
});

test("advisor assignment import does not accept legacy lecturer identifiers", () => {
  const csv = Buffer.from(
    "NIM,Program Studi,NIP\n12345,Teknologi Rekayasa Logistik,198701012010011001",
  );

  assert.throws(
    () => parseAdvisorAssignmentFile(csv, "pembagian.csv"),
    /Kolom DPA atau NUPTK tidak ditemukan/,
  );
});

test("new student import reads required email and phone alongside optional details", () => {
  const csv = Buffer.from(
    "NIM,Nama Lengkap,PRODI,Angkatan,Email,No Handphone,Nama SMTA,Kata Sandi\n24409901,Contoh Mahasiswa,Teknologi Rekayasa Logistik,2024,mahasiswa@example.com,081234567890,SMA Berau,rahasia123",
  );

  assert.deepEqual(parseNewStudentImportFile(csv, "mahasiswa.csv"), [
    {
      nim: 24409901,
      nama: "Contoh Mahasiswa",
      jurusan: "Teknologi Rekayasa Logistik",
      password: "rahasia123",
      email: "mahasiswa@example.com",
      noHandphone: "081234567890",
      angkatan: 2024,
      namaSmta: "SMA Berau",
    },
  ]);
});

test("new student import rejects duplicate NIMs and missing passwords", () => {
  const duplicateNims = Buffer.from(
    "NIM,Nama,PRODI,Email,No Handphone,Kata Sandi\n12345,Budi,TI,budi@example.com,081234567890,rahasia123\n12345,Budi,TI,budi@example.com,081234567890,rahasia456",
  );
  assert.throws(
    () => parseNewStudentImportFile(duplicateNims, "mahasiswa.csv"),
    /muncul lebih dari sekali/,
  );

  const missingPassword = Buffer.from(
    "NIM,Nama,PRODI,Email,No Handphone\n12345,Budi,TI,budi@example.com,081234567890",
  );
  assert.throws(
    () => parseNewStudentImportFile(missingPassword, "mahasiswa.csv"),
    /Kata Sandi/,
  );
});

test("new student import requires Email and No Handphone columns and values", () => {
  const missingColumns = Buffer.from(
    "NIM,Nama,PRODI,Kata Sandi\n12345,Budi,TI,rahasia123",
  );
  assert.throws(
    () => parseNewStudentImportFile(missingColumns, "mahasiswa.csv"),
    /Email, No Handphone/,
  );

  const emptyEmail = Buffer.from(
    "NIM,Nama,PRODI,Email,No Handphone,Kata Sandi\n12345,Budi,TI,,081234567890,rahasia123",
  );
  assert.throws(
    () => parseNewStudentImportFile(emptyEmail, "mahasiswa.csv"),
    /Email dan No Handphone wajib diisi/,
  );

  const emptyPhone = Buffer.from(
    "NIM,Nama,PRODI,Email,No Handphone,Kata Sandi\n12345,Budi,TI,budi@example.com,,rahasia123",
  );
  assert.throws(
    () => parseNewStudentImportFile(emptyPhone, "mahasiswa.csv"),
    /Email dan No Handphone wajib diisi/,
  );
});

test("new lecturer import reads NUPTK from XLS files and requires unique login details", () => {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([
      ["NUPTK", "Nama", "Email", "Kata Sandi"],
      ["198701012010011001", "Dosen Baru", "dosen@example.com", "rahasia123"],
    ]),
    "Data",
  );
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xls" });

  assert.deepEqual(parseNewLecturerImportFile(buffer, "dosen.xls"), [
    {
      nuptk: 198701012010011001n,
      nama: "Dosen Baru",
      email: "dosen@example.com",
      password: "rahasia123",
    },
  ]);
});

test("new lecturer import requires NUPTK", () => {
  const csv = Buffer.from(
    "Nama,Email,Kata Sandi\nDosen Baru,dosen@example.com,rahasia123",
  );

  assert.throws(
    () => parseNewLecturerImportFile(csv, "dosen.csv"),
    /NUPTK/,
  );
});
