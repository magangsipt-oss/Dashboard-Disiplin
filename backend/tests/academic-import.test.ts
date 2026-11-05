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
      "No,Mata_Kuliah,Kelas,NIM,Nama_Mahasiswa,Jumlah_Kehadiran,Kehadiran,Sakit,Ijin,Alpa",
      '1,"Pemrograman, Dasar",TI-1,12345,"Budi Santoso",14,12,1,0,1',
    ].join("\n"),
  );

  const rows = parseAcademicAttendanceFile(csv, "absensi.csv");
  assert.deepEqual(rows, [
    {
      mataKuliah: "Pemrograman, Dasar",
      kelas: "TI-1",
      nim: 12345,
      namaMahasiswa: "Budi Santoso",
      jumlahKehadiran: 14,
    },
  ]);
  assert.equal(rows[0].alpa, 1);
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
      "No,Mata_Kuliah,Kelas,NIM,Nama_Mahasiswa,Jumlah_Kehadiran,Kehadiran,Sakit,Ijin,Alpa",
      '1,"Pemrograman Dasar",TI-1,12345,"Budi Santoso",14,14,0,0,0',
      '2,"Pemrograman Dasar",TI-1,12345,"Budi Santoso Jr.",13,13,0,0,0',
    ].join("\n"),
  );

  assert.throws(
    () => parseAcademicAttendanceFile(csv, "absensi.csv"),
    (error: unknown) =>
      error instanceof AcademicImportValidationError &&
      error.message.includes("Gunakan NIM sebagai identitas utama"),
  );
});

test("advisor assignment import reads every template column plus an optional NUPTK", () => {
  const workbook = makeWorkbookBuffer([
    ["No.", "NIM", "Nama Lengkap", "Program Studi", "Angkatan", "DPA", "NUPTK"],
    [1, 12345, "Budi Santoso", "Teknologi Rekayasa Logistik", 2023, "Hamim Rachman", "198701012010011001"],
  ]);

  assert.deepEqual(
    parseAdvisorAssignmentFile(workbook, "pembagian.xlsx"),
    [
      {
        nim: 12345,
        programStudi: "Teknologi Rekayasa Logistik",
        nuptk: "198701012010011001",
        dpa: "Hamim Rachman",
      },
    ],
  );
});

test("attendance import rejects missing required columns", () => {
  const csv = Buffer.from("No,Mata_Kuliah,Kelas,NIM,Nama_Mahasiswa,Jumlah_Kehadiran\n1,Matematika,A,12345,Budi,14");

  assert.throws(
    () => parseAcademicAttendanceFile(csv, "absensi.csv"),
    /Kolom wajib tidak ditemukan: Kehadiran, Sakit, Ijin, Alpa/,
  );
});

test("attendance import requires every column to be filled", () => {
  const csv = Buffer.from(
    "No,Mata_Kuliah,Kelas,NIM,Nama_Mahasiswa,Jumlah_Kehadiran,Kehadiran,Sakit,Ijin,Alpa\n1,Matematika,A,12345,Budi,14,14,,0,",
  );

  assert.throws(
    () => parseAcademicAttendanceFile(csv, "absensi.csv"),
    /Sakit, Alpa wajib diisi pada baris 2/,
  );
});

test("advisor assignment import rejects duplicate student NIMs", () => {
  const csv = Buffer.from(
    "No.,NIM,Nama Lengkap,Program Studi,Angkatan,DPA\n1,12345,Budi,TR Logistik,2023,Dosen A\n2,12345,Budi,TR Logistik,2023,Dosen B",
  );

  assert.throws(
    () => parseAdvisorAssignmentFile(csv, "pembagian.csv"),
    (error: unknown) =>
      error instanceof AcademicImportValidationError &&
      error.message.includes("muncul lebih dari sekali"),
  );
});

test("advisor assignment import requires every template column", () => {
  const csv = Buffer.from("No.,NIM,Nama Lengkap,DPA\n1,12345,Budi,Dosen A");

  assert.throws(
    () => parseAdvisorAssignmentFile(csv, "pembagian.csv"),
    /Kolom wajib tidak ditemukan: Program Studi, Angkatan/,
  );
});

test("advisor assignment import requires DPA even when NUPTK is given", () => {
  const csv = Buffer.from(
    "No.,NIM,Nama Lengkap,Program Studi,Angkatan,NUPTK\n1,12345,Budi,Teknologi Rekayasa Logistik,2023,198701012010011001",
  );

  assert.throws(
    () => parseAdvisorAssignmentFile(csv, "pembagian.csv"),
    /Kolom wajib tidak ditemukan: DPA/,
  );
});

test("new student import reads every template column", () => {
  const csv = Buffer.from(
    "No,NIM,Nama Lengkap,No Handphone,Email,Program Studi,Angkatan,Nama SMTA,Kata Sandi\n1,24409901,Contoh Mahasiswa,081234567890,mahasiswa@example.com,Teknologi Rekayasa Logistik,2024,SMA Berau,rahasia123",
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
    "No,NIM,Nama Lengkap,No Handphone,Email,Program Studi,Angkatan,Nama SMTA,Kata Sandi\n1,12345,Budi,081234567890,budi@example.com,TI,2024,SMA 1,rahasia123\n2,12345,Budi,081234567890,budi@example.com,TI,2024,SMA 1,rahasia456",
  );
  assert.throws(
    () => parseNewStudentImportFile(duplicateNims, "mahasiswa.csv"),
    /muncul lebih dari sekali/,
  );

  const missingPassword = Buffer.from(
    "No,NIM,Nama Lengkap,No Handphone,Email,Program Studi,Angkatan,Nama SMTA\n1,12345,Budi,081234567890,budi@example.com,TI,2024,SMA 1",
  );
  assert.throws(
    () => parseNewStudentImportFile(missingPassword, "mahasiswa.csv"),
    /Kata Sandi/,
  );
});

test("new student import requires every template column and value", () => {
  const missingColumns = Buffer.from(
    "No.,NIM,Nama Lengkap,Program Studi,Email,No Handphone,Kata Sandi\n1,12345,Budi,TI,budi@example.com,081234567890,rahasia123",
  );
  assert.throws(
    () => parseNewStudentImportFile(missingColumns, "mahasiswa.csv"),
    /Kolom wajib tidak ditemukan: Angkatan, Nama SMTA/,
  );

  const emptyValues = Buffer.from(
    "No,NIM,Nama Lengkap,No Handphone,Email,Program Studi,Angkatan,Nama SMTA,Kata Sandi\n1,12345,Budi,081234567890,,TI,,SMA 1,rahasia123",
  );
  assert.throws(
    () => parseNewStudentImportFile(emptyValues, "mahasiswa.csv"),
    /Email, Angkatan wajib diisi pada baris 2/,
  );
});

test("new lecturer import reads NUPTK from XLS files and requires unique login details", () => {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([
      ["No", "Nama Dosen", "Email", "NUPTK", "PRODI", "Password"],
      ["1", "Dosen Baru", "dosen@example.com", "198701012010011001", "Teknologi Rekayasa Logistik", "rahasia123"],
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

test("new lecturer import requires every template column", () => {
  const csv = Buffer.from(
    "No,Nama Dosen,Email,Password\n1,Dosen Baru,dosen@example.com,rahasia123",
  );

  assert.throws(
    () => parseNewLecturerImportFile(csv, "dosen.csv"),
    /Kolom wajib tidak ditemukan: NUPTK, PRODI/,
  );
});

test("new lecturer import accepts '-' as empty data/null and allows multiple lecturers without NUPTK", () => {
  const workbook = makeWorkbookBuffer([
    ["No", "Nama Dosen", "Email", "NUPTK", "PRODI", "Password"],
    ["1", "Zulkarnaen", "zulkarnaen@poltek.ac.id", "-", "D-III Perawatan Mesin", "Zulkarnaen@poltek"],
    ["2", "Munawar", "-", "-", "D-III Perawatan Mesin", "Munawar@poltek"],
    ["3", "Nisa", "nisa@poltek.ac.id", "", "-", "Nisa@poltek"],
  ]);

  const rows = parseNewLecturerImportFile(workbook, "Dosen.xlsx");
  assert.equal(rows.length, 3);
  assert.deepEqual(rows[0], {
    nuptk: null,
    nama: "Zulkarnaen",
    email: "zulkarnaen@poltek.ac.id",
    password: "Zulkarnaen@poltek",
  });
  assert.deepEqual(rows[1], {
    nuptk: null,
    nama: "Munawar",
    email: null,
    password: "Munawar@poltek",
  });
  assert.deepEqual(rows[2], {
    nuptk: null,
    nama: "Nisa",
    email: "nisa@poltek.ac.id",
    password: "Nisa@poltek",
  });
});

test("new student import accepts '-' as empty data/null for optional fields", () => {
  const csv = Buffer.from(
    "No,NIM,Nama Lengkap,No Handphone,Email,Program Studi,Angkatan,Nama SMTA,Kata Sandi\n" +
    "1,24409901,Mahasiswa Baru,-,-,Teknologi Rekayasa Logistik,-,-,rahasia123",
  );

  const rows = parseNewStudentImportFile(csv, "mahasiswa.csv");
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0], {
    nim: 24409901,
    nama: "Mahasiswa Baru",
    jurusan: "Teknologi Rekayasa Logistik",
    password: "rahasia123",
    email: null,
    noHandphone: null,
    angkatan: null,
    namaSmta: null,
  });
});

test("attendance import accepts '-' as 0 count and skips dash placeholder rows", () => {
  const workbook = makeWorkbookBuffer([
    ["NO", "Matakuliah", "Kelas", "NIM", "Nama Mahasiswa", "Jumlah Kehadiran", "Kehadiran", "Sakit", "Ijin", "Alpa"],
    [1, "Matematika", "TI-1", 23401024, "Abin Nabawi", 14, 14, "-", "-", "-"],
    [2, "-", "-", "-", "-", "-", "-", "-", "-", "-"],
  ]);

  const rows = parseAcademicAttendanceFile(workbook, "absensi.xlsx");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].nim, 23401024);
  assert.equal(rows[0].sakit, 0);
  assert.equal(rows[0].ijin, 0);
  assert.equal(rows[0].alpa, 0);
});

test("advisor assignment import accepts '-' as empty/null for DPA and NUPTK", () => {
  const workbook = makeWorkbookBuffer([
    ["No.", "NIM", "Nama Lengkap", "Program Studi", "Angkatan", "DPA", "NUPTK"],
    [1, 12345, "Budi Santoso", "Teknologi Rekayasa Logistik", 2023, "-", "-"],
  ]);

  const rows = parseAdvisorAssignmentFile(workbook, "pembagian.xlsx");
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0], {
    nim: 12345,
    programStudi: "Teknologi Rekayasa Logistik",
    nuptk: undefined,
    dpa: null,
  });
});
