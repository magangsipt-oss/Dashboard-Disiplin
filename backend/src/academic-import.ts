import * as XLSX from "xlsx";

const MAX_IMPORT_ROWS = 20_000;
const MAX_NIM = 2_147_483_647;
const MAX_POSTGRES_BIGINT = 9_223_372_036_854_775_807n;

export class AcademicImportValidationError extends Error {}

export type AcademicAttendanceRow = {
  mataKuliah: string;
  kelas: string;
  nim: number;
  namaMahasiswa: string;
  jumlahKehadiran: number;
  alpa: number;
  ijin: number;
  sakit: number;
};

export type AdvisorAssignmentRow = {
  nim: number;
  programStudi: string;
  nuptk?: string;
  dpa: string;
};

export type NewStudentImportRow = {
  nim: number;
  nama: string;
  jurusan: string;
  password: string;
  email: string;
  noHandphone: string;
  angkatan: number;
  namaSmta: string;
};

export type NewLecturerImportRow = {
  nuptk: bigint;
  nama: string;
  email: string;
  password: string;
};

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .replace(/^\uFEFF/, "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function cellText(value: unknown): string {
  return String(value ?? "").trim();
}

// [label di template, alias judul kolom]. Alias dicek berurutan agar nama yang
// lebih spesifik menang (mis. "Jumlah Kehadiran" sebelum "Kehadiran").
type ColumnSpec = readonly [label: string, aliases: readonly string[]];

function findColumn(headers: string[], aliases: readonly string[]): number {
  for (const alias of aliases) {
    const index = headers.indexOf(alias);
    if (index !== -1) return index;
  }
  return -1;
}

// Semua kolom template wajib ada dan wajib diisi.
function findRequiredColumns(headers: string[], specs: readonly ColumnSpec[]): number[] {
  const indexes = specs.map(([, aliases]) => findColumn(headers, aliases));
  const missing = specs.filter((_, position) => indexes[position] === -1);
  if (missing.length > 0) {
    throw new AcademicImportValidationError(
      `Kolom wajib tidak ditemukan: ${missing.map(([label]) => label).join(", ")}.`,
    );
  }
  return indexes;
}

function assertRowFilled(
  row: unknown[],
  specs: readonly ColumnSpec[],
  indexes: number[],
  sourceRow: number,
) {
  const empty = specs.filter((_, position) => cellText(row[indexes[position]]) === "");
  if (empty.length > 0) {
    throw new AcademicImportValidationError(
      `${empty.map(([label]) => label).join(", ")} wajib diisi pada baris ${sourceRow}.`,
    );
  }
}

function parseCount(value: unknown, label: string, sourceRow: number): number {
  const text = cellText(value).replace(/\.0+$/, "");
  const count = Number(text);
  if (!/^\d+$/.test(text) || !Number.isSafeInteger(count)) {
    throw new AcademicImportValidationError(
      `${label} pada baris ${sourceRow} harus berupa angka bulat nol atau lebih.`,
    );
  }
  return count;
}

const NO_ALIASES = ["no", "nomor"] as const;

function parseImportPassword(value: unknown, sourceRow: number): string {
  const password = cellText(value);
  if (!password || password.length > 128) {
    throw new AcademicImportValidationError(
      `Kata Sandi pada baris ${sourceRow} wajib diisi dan maksimal 128 karakter.`,
    );
  }
  return password;
}

function parseEmail(value: unknown, sourceRow: number): string {
  const email = cellText(value);
  if (
    email.length > 255 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    throw new AcademicImportValidationError(
      `Email pada baris ${sourceRow} tidak valid.`,
    );
  }
  return email;
}

function readImportRecords(buffer: Buffer, fileName: string) {
  const matrix = readSheetMatrix(buffer, fileName);
  const headerRow = matrix[0];
  if (!headerRow) {
    throw new AcademicImportValidationError("File tidak memiliki baris judul kolom.");
  }

  const headers = headerRow.map(normalizeHeader);
  const records = matrix
    .slice(1)
    .map((row, index) => ({ row, sourceRow: index + 2 }))
    .filter(({ row }) => row.some((value) => cellText(value) !== ""));
  if (records.length === 0) {
    throw new AcademicImportValidationError("File tidak berisi baris data.");
  }
  if (records.length > MAX_IMPORT_ROWS) {
    throw new AcademicImportValidationError(
      `File maksimal berisi ${MAX_IMPORT_ROWS.toLocaleString("id-ID")} baris data.`,
    );
  }

  return { headers, records };
}

function readSheetMatrix(buffer: Buffer, fileName: string): unknown[][] {
  const extension = fileName.toLowerCase().split(".").pop();
  if (extension !== "csv" && extension !== "xls" && extension !== "xlsx") {
    throw new AcademicImportValidationError(
      "Format file harus CSV atau Excel (.xls, .xlsx).",
    );
  }

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: "buffer", raw: true });
  } catch {
    throw new AcademicImportValidationError(
      "File tidak dapat dibaca. Pastikan file CSV atau Excel (.xls, .xlsx) valid.",
    );
  }

  const firstSheetName = workbook.SheetNames[0];
  const sheet = firstSheetName ? workbook.Sheets[firstSheetName] : undefined;
  if (!sheet) {
    throw new AcademicImportValidationError("File tidak memiliki lembar data.");
  }

  return XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    blankrows: false,
    defval: "",
    raw: false,
  });
}

function parseNim(value: unknown, sourceRow: number): number {
  const text = cellText(value).replace(/\.0+$/, "");
  if (!/^[1-9]\d*$/.test(text)) {
    throw new AcademicImportValidationError(
      `NIM pada baris ${sourceRow} harus berupa angka bulat positif.`,
    );
  }
  const nim = Number(text);
  if (!Number.isSafeInteger(nim) || nim > MAX_NIM) {
    throw new AcademicImportValidationError(
      `NIM pada baris ${sourceRow} tidak valid.`,
    );
  }
  return nim;
}

function parseNuptk(value: unknown, sourceRow: number): string {
  const text = cellText(value).replace(/\.0+$/, "");
  if (!/^[1-9]\d*$/.test(text)) {
    throw new AcademicImportValidationError(
      `NUPTK pada baris ${sourceRow} harus berupa angka bulat positif.`,
    );
  }
  const nuptk = BigInt(text);
  if (nuptk > MAX_POSTGRES_BIGINT) {
    throw new AcademicImportValidationError(
      `NUPTK pada baris ${sourceRow} melebihi batas angka yang didukung.`,
    );
  }
  return text;
}

function parseImportBigInt(value: unknown, label: string, sourceRow: number): bigint {
  const text = cellText(value).replace(/\.0+$/, "");
  if (!/^[1-9]\d*$/.test(text)) {
    throw new AcademicImportValidationError(
      `${label} pada baris ${sourceRow} harus berupa angka bulat positif.`,
    );
  }
  const parsed = BigInt(text);
  if (parsed > MAX_POSTGRES_BIGINT) {
    throw new AcademicImportValidationError(
      `${label} pada baris ${sourceRow} melebihi batas angka yang didukung.`,
    );
  }
  return parsed;
}

export function parseNewStudentImportFile(
  buffer: Buffer,
  fileName: string,
): NewStudentImportRow[] {
  const { headers, records } = readImportRecords(buffer, fileName);
  const specs: ColumnSpec[] = [
    ["No.", NO_ALIASES],
    ["NIM", ["nim"]],
    ["Nama Lengkap", ["nama_lengkap", "nama_mahasiswa", "nama"]],
    ["Program Studi", ["program_studi", "prodi", "jurusan"]],
    ["Angkatan", ["angkatan", "tahun_masuk"]],
    ["Nama SMTA", ["nama_smta", "asal_sekolah"]],
    ["Email", ["email"]],
    ["No Handphone", ["no_handphone", "nomor_handphone", "no_hp", "telepon"]],
    ["Kata Sandi", ["kata_sandi", "password", "password_awal"]],
  ];
  const indexes = findRequiredColumns(headers, specs);
  const [, nimColumn, namaColumn, jurusanColumn, angkatanColumn, smtaColumn, emailColumn, phoneColumn, passwordColumn] =
    indexes;

  const seenNims = new Set<number>();
  return records.map(({ row, sourceRow }) => {
    assertRowFilled(row, specs, indexes, sourceRow);
    const nim = parseNim(row[nimColumn], sourceRow);
    if (seenNims.has(nim)) {
      throw new AcademicImportValidationError(
        `NIM ${nim} muncul lebih dari sekali pada file mahasiswa.`,
      );
    }
    seenNims.add(nim);

    const nama = cellText(row[namaColumn]);
    const jurusan = cellText(row[jurusanColumn]);
    const emailText = cellText(row[emailColumn]);
    const phone = cellText(row[phoneColumn]);
    const school = cellText(row[smtaColumn]);
    const angkatan = Number(cellText(row[angkatanColumn]).replace(/\.0+$/, ""));
    if (!Number.isInteger(angkatan) || angkatan < 1900 || angkatan > 2100) {
      throw new AcademicImportValidationError(
        `Angkatan pada baris ${sourceRow} harus berupa tahun yang valid.`,
      );
    }
    if (phone.length > 30) {
      throw new AcademicImportValidationError(
        `No Handphone pada baris ${sourceRow} maksimal 30 karakter.`,
      );
    }
    if (school.length > 255) {
      throw new AcademicImportValidationError(
        `Nama SMTA pada baris ${sourceRow} maksimal 255 karakter.`,
      );
    }

    return {
      nim,
      nama,
      jurusan,
      password: parseImportPassword(row[passwordColumn], sourceRow),
      email: parseEmail(emailText, sourceRow),
      noHandphone: phone,
      angkatan,
      namaSmta: school,
    };
  });
}

export function parseNewLecturerImportFile(
  buffer: Buffer,
  fileName: string,
): NewLecturerImportRow[] {
  const { headers, records } = readImportRecords(buffer, fileName);
  const specs: ColumnSpec[] = [
    ["No", NO_ALIASES],
    ["Nama Dosen", ["nama_dosen", "nama_lengkap", "nama"]],
    ["Email", ["email"]],
    ["NUPTK", ["nuptk"]],
    ["PRODI", ["prodi", "program_studi", "jurusan"]],
    ["Password", ["password", "kata_sandi", "password_awal"]],
  ];
  const indexes = findRequiredColumns(headers, specs);
  const [, namaColumn, emailColumn, nuptkColumn, , passwordColumn] = indexes;

  const seenNuptks = new Set<string>();
  const seenEmails = new Set<string>();
  return records.map(({ row, sourceRow }) => {
    assertRowFilled(row, specs, indexes, sourceRow);
    const nuptk = parseImportBigInt(row[nuptkColumn], "NUPTK", sourceRow);
    const email = parseEmail(row[emailColumn], sourceRow);
    const nama = cellText(row[namaColumn]);

    for (const [value, seen, label] of [
      [nuptk.toString(), seenNuptks, "NUPTK"],
      [email.toLowerCase(), seenEmails, "Email"],
    ] as const) {
      if (seen.has(value)) {
        throw new AcademicImportValidationError(
          `${label} ${value} muncul lebih dari sekali pada file dosen.`,
        );
      }
      seen.add(value);
    }

    return {
      nuptk,
      nama,
      email,
      password: parseImportPassword(row[passwordColumn], sourceRow),
    };
  });
}

export function parseAcademicAttendanceFile(
  buffer: Buffer,
  fileName: string,
): AcademicAttendanceRow[] {
  const matrix = readSheetMatrix(buffer, fileName);
  const headerRow = matrix[0];
  if (!headerRow) {
    throw new AcademicImportValidationError("File tidak memiliki baris judul kolom.");
  }

  const headers = headerRow.map(normalizeHeader);
  const specs: ColumnSpec[] = [
    ["NO", NO_ALIASES],
    ["Matakuliah", ["mata_kuliah", "matakuliah", "mata_kuliah_kegiatan", "mk", "matkul"]],
    ["Kelas", ["kelas"]],
    ["NIM", ["nim"]],
    ["Nama Mahasiswa", ["nama_mahasiswa", "namamahasiswa", "nama_lengkap", "nama"]],
    ["Jumlah Kehadiran", ["jumlah_kehadiran", "jumlahkehadiran"]],
    ["Kehadiran", ["kehadiran", "hadir"]],
    ["Sakit", ["sakit", "s"]],
    ["Ijin", ["ijin", "izin", "i"]],
    ["Alpa", ["alpa", "alpha", "tanpa_keterangan", "a"]],
  ];
  const indexes = findRequiredColumns(headers, specs);
  const [
    ,
    mataKuliahIndex,
    kelasIndex,
    nimIndex,
    namaMahasiswaIndex,
    jumlahKehadiranIndex,
    kehadiranIndex,
    sakitIndex,
    ijinIndex,
    alpaIndex,
  ] = indexes;

  const records = matrix
    .slice(1)
    .map((row, index) => ({ row, sourceRow: index + 2 }))
    .filter(({ row }) => {
      const nimText = cellText(row[nimIndex]);
      const mkText = cellText(row[mataKuliahIndex]);
      return nimText !== "" && mkText !== "";
    });

  if (records.length === 0) {
    throw new AcademicImportValidationError("File tidak berisi baris data mahasiswa yang valid.");
  }
  if (records.length > MAX_IMPORT_ROWS) {
    throw new AcademicImportValidationError(
      `File maksimal berisi ${MAX_IMPORT_ROWS.toLocaleString("id-ID")} baris data.`,
    );
  }

  const seenNimNames = new Map<string, string>();

  return records.map(({ row, sourceRow }) => {
    assertRowFilled(row, specs, indexes, sourceRow);
    const mataKuliah = cellText(row[mataKuliahIndex]);
    const kelas = cellText(row[kelasIndex]);
    const namaMahasiswa = cellText(row[namaMahasiswaIndex]);
    const nim = parseNim(row[nimIndex], sourceRow);
    const key = `${mataKuliah}::${kelas}::${nim}`;
    const existingName = seenNimNames.get(key);

    if (existingName && existingName !== namaMahasiswa) {
      throw new AcademicImportValidationError(
        `NIM ${nim} pada mata kuliah "${mataKuliah}" dan kelas "${kelas}" muncul dengan nama yang berbeda: "${existingName}" dan "${namaMahasiswa}". Gunakan NIM sebagai identitas utama untuk pengurangan poin.`,
      );
    }
    seenNimNames.set(key, namaMahasiswa);

    const jumlahKehadiran = parseCount(row[jumlahKehadiranIndex], "Jumlah Kehadiran", sourceRow);
    parseCount(row[kehadiranIndex], "Kehadiran", sourceRow);
    const sakit = parseCount(row[sakitIndex], "Sakit", sourceRow);
    const ijin = parseCount(row[ijinIndex], "Ijin", sourceRow);
    const alpa = parseCount(row[alpaIndex], "Alpa", sourceRow);

    const record = {
      mataKuliah,
      kelas,
      nim,
      namaMahasiswa,
      jumlahKehadiran,
    } as AcademicAttendanceRow;

    Object.defineProperties(record, {
      alpa: { value: alpa, enumerable: false, writable: true, configurable: true },
      ijin: { value: ijin, enumerable: false, writable: true, configurable: true },
      sakit: { value: sakit, enumerable: false, writable: true, configurable: true },
    });

    return record;
  });
}

export function parseAdvisorAssignmentFile(
  buffer: Buffer,
  fileName: string,
): AdvisorAssignmentRow[] {
  const matrix = readSheetMatrix(buffer, fileName);
  const headerRow = matrix[0];
  if (!headerRow) {
    throw new AcademicImportValidationError("File tidak memiliki baris judul kolom.");
  }

  const headers = headerRow.map(normalizeHeader);
  const specs: ColumnSpec[] = [
    ["No.", NO_ALIASES],
    ["NIM", ["nim"]],
    ["Nama Lengkap", ["nama_lengkap", "nama_mahasiswa", "nama"]],
    ["Program Studi", ["program_studi", "prodi", "jurusan"]],
    ["Angkatan", ["angkatan", "tahun_masuk"]],
    ["DPA", ["dpa", "dosen_pa", "nama_dosen", "dosen", "dpa_nama"]],
  ];
  const indexes = findRequiredColumns(headers, specs);
  const [, nimIndex, , programStudiIndex, , dpaIndex] = indexes;
  // Kolom NUPTK di luar template tetap boleh ditambahkan untuk mencocokkan dosen lebih pasti.
  const nuptkIndex = headers.indexOf("nuptk");

  const records = matrix
    .slice(1)
    .map((row, index) => ({ row, sourceRow: index + 2 }))
    .filter(({ row }) => row.some((value) => cellText(value) !== ""));

  if (records.length === 0) {
    throw new AcademicImportValidationError("File tidak berisi baris data.");
  }
  if (records.length > MAX_IMPORT_ROWS) {
    throw new AcademicImportValidationError(
      `File maksimal berisi ${MAX_IMPORT_ROWS.toLocaleString("id-ID")} baris data.`,
    );
  }

  const seenNims = new Set<number>();

  return records.map(({ row, sourceRow }) => {
    assertRowFilled(row, specs, indexes, sourceRow);
    const nim = parseNim(row[nimIndex], sourceRow);
    const programStudi = cellText(row[programStudiIndex]);

    if (seenNims.has(nim)) {
      throw new AcademicImportValidationError(
        `NIM ${nim} muncul lebih dari sekali pada file pembagian.`,
      );
    }
    seenNims.add(nim);

    const nuptkText = nuptkIndex !== -1 ? cellText(row[nuptkIndex]) : "";
    return {
      nim,
      programStudi,
      nuptk: nuptkText ? parseNuptk(nuptkText, sourceRow) : undefined,
      dpa: cellText(row[dpaIndex]),
    };
  });
}
