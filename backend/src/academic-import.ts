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
  dpa: string | null;
};

export type NewStudentImportRow = {
  nim: number;
  nama: string;
  jurusan: string;
  password: string;
  email: string | null;
  noHandphone: string | null;
  angkatan: number | null;
  namaSmta: string | null;
};

export type NewLecturerImportRow = {
  nuptk: bigint | null;
  nama: string;
  email: string | null;
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

export function isDash(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  const text = String(value).trim();
  return /^[-–—]+$/.test(text);
}

export function isBlankOrDash(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  const text = String(value).trim();
  return text === "" || /^[-–—]+$/.test(text);
}

export function cellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = String(value).trim();
  return /^[-–—]+$/.test(text) ? "" : text;
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

// Semua kolom template wajib ada dan judulnya cocok.
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
  optionalLabels?: ReadonlySet<string>,
) {
  const empty = specs.filter(([label], position) => {
    if (optionalLabels?.has(label)) return false;
    const val = row[indexes[position]];
    // Karakter "-" dianggap sebagai penanda data kosong/null yang sah
    if (isDash(val)) return false;
    return String(val ?? "").trim() === "";
  });
  if (empty.length > 0) {
    throw new AcademicImportValidationError(
      `${empty.map(([label]) => label).join(", ")} wajib diisi pada baris ${sourceRow}.`,
    );
  }
}

function parseCount(value: unknown, label: string, sourceRow: number): number {
  if (isBlankOrDash(value)) {
    return 0;
  }
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
    ["No", NO_ALIASES],
    ["NIM", ["nim"]],
    ["Nama Lengkap", ["nama_lengkap", "nama_mahasiswa", "nama"]],
    ["No Handphone", ["no_handphone", "nomor_handphone", "no_hp", "telepon"]],
    ["Email", ["email"]],
    ["Program Studi", ["program_studi", "prodi", "jurusan"]],
    ["Angkatan", ["angkatan", "tahun_masuk"]],
    ["Nama SMTA", ["nama_smta", "asal_sekolah"]],
    ["Kata Sandi", ["kata_sandi", "password", "password_awal"]],
  ];
  const indexes = findRequiredColumns(headers, specs);
  const [, nimColumn, namaColumn, phoneColumn, emailColumn, jurusanColumn, angkatanColumn, smtaColumn, passwordColumn] =
    indexes;

  const seenNims = new Set<number>();
  const optionalStudentLabels = new Set(["No"]);
  return records.map(({ row, sourceRow }) => {
    assertRowFilled(row, specs, indexes, sourceRow, optionalStudentLabels);
    const nim = parseNim(row[nimColumn], sourceRow);
    if (seenNims.has(nim)) {
      throw new AcademicImportValidationError(
        `NIM ${nim} muncul lebih dari sekali pada file mahasiswa.`,
      );
    }
    seenNims.add(nim);

    const nama = cellText(row[namaColumn]);
    if (!nama) {
      throw new AcademicImportValidationError(
        `Nama Lengkap wajib diisi pada baris ${sourceRow}.`,
      );
    }
    const jurusan = cellText(row[jurusanColumn]);
    if (!jurusan) {
      throw new AcademicImportValidationError(
        `Program Studi wajib diisi pada baris ${sourceRow}.`,
      );
    }

    const emailRaw = row[emailColumn];
    const email = isBlankOrDash(emailRaw) ? null : parseEmail(emailRaw, sourceRow);

    const phoneRaw = row[phoneColumn];
    const phone = isBlankOrDash(phoneRaw) ? null : cellText(phoneRaw);
    if (phone && phone.length > 30) {
      throw new AcademicImportValidationError(
        `No Handphone pada baris ${sourceRow} maksimal 30 karakter.`,
      );
    }

    const schoolRaw = row[smtaColumn];
    const school = isBlankOrDash(schoolRaw) ? null : cellText(schoolRaw);
    if (school && school.length > 255) {
      throw new AcademicImportValidationError(
        `Nama SMTA pada baris ${sourceRow} maksimal 255 karakter.`,
      );
    }

    const angkatanRaw = row[angkatanColumn];
    let angkatan: number | null = null;
    if (!isBlankOrDash(angkatanRaw)) {
      const parsedAngkatan = Number(cellText(angkatanRaw).replace(/\.0+$/, ""));
      if (!Number.isInteger(parsedAngkatan) || parsedAngkatan < 1900 || parsedAngkatan > 2100) {
        throw new AcademicImportValidationError(
          `Angkatan pada baris ${sourceRow} harus berupa tahun yang valid.`,
        );
      }
      angkatan = parsedAngkatan;
    }

    return {
      nim,
      nama,
      jurusan,
      password: parseImportPassword(row[passwordColumn], sourceRow),
      email,
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
  const optionalLecturerLabels = new Set(["No", "NUPTK", "PRODI", "Email"]);
  return records.map(({ row, sourceRow }) => {
    assertRowFilled(row, specs, indexes, sourceRow, optionalLecturerLabels);
    const nama = cellText(row[namaColumn]);
    if (!nama) {
      throw new AcademicImportValidationError(
        `Nama Dosen wajib diisi pada baris ${sourceRow}.`,
      );
    }
    const password = parseImportPassword(row[passwordColumn], sourceRow);

    const nuptkRaw = row[nuptkColumn];
    const nuptk = isBlankOrDash(nuptkRaw)
      ? null
      : parseImportBigInt(nuptkRaw, "NUPTK", sourceRow);

    const emailRaw = row[emailColumn];
    const email = isBlankOrDash(emailRaw)
      ? null
      : parseEmail(emailRaw, sourceRow);

    if (nuptk !== null) {
      const nuptkStr = nuptk.toString();
      if (seenNuptks.has(nuptkStr)) {
        throw new AcademicImportValidationError(
          `NUPTK ${nuptkStr} muncul lebih dari sekali pada file dosen.`,
        );
      }
      seenNuptks.add(nuptkStr);
    }

    if (email !== null) {
      const emailLower = email.toLowerCase();
      if (seenEmails.has(emailLower)) {
        throw new AcademicImportValidationError(
          `Email ${email} muncul lebih dari sekali pada file dosen.`,
        );
      }
      seenEmails.add(emailLower);
    }

    return {
      nuptk,
      nama,
      email,
      password,
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
  const optionalAttendanceLabels = new Set(["NO"]);

  return records.map(({ row, sourceRow }) => {
    assertRowFilled(row, specs, indexes, sourceRow, optionalAttendanceLabels);
    const mataKuliah = cellText(row[mataKuliahIndex]);
    const kelas = cellText(row[kelasIndex]);
    const namaMahasiswa = cellText(row[namaMahasiswaIndex]);
    if (!mataKuliah) {
      throw new AcademicImportValidationError(
        `Matakuliah wajib diisi pada baris ${sourceRow}.`,
      );
    }
    if (!kelas) {
      throw new AcademicImportValidationError(
        `Kelas wajib diisi pada baris ${sourceRow}.`,
      );
    }
    if (!namaMahasiswa) {
      throw new AcademicImportValidationError(
        `Nama Mahasiswa wajib diisi pada baris ${sourceRow}.`,
      );
    }
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
  const optionalAdvisorLabels = new Set(["No.", "Nama Lengkap", "Angkatan"]);

  return records.map(({ row, sourceRow }) => {
    assertRowFilled(row, specs, indexes, sourceRow, optionalAdvisorLabels);
    const nim = parseNim(row[nimIndex], sourceRow);
    const programStudi = cellText(row[programStudiIndex]);
    if (!programStudi) {
      throw new AcademicImportValidationError(
        `Program Studi wajib diisi pada baris ${sourceRow}.`,
      );
    }

    if (seenNims.has(nim)) {
      throw new AcademicImportValidationError(
        `NIM ${nim} muncul lebih dari sekali pada file pembagian.`,
      );
    }
    seenNims.add(nim);

    const nuptkRaw = nuptkIndex !== -1 ? row[nuptkIndex] : "";
    const nuptk = isBlankOrDash(nuptkRaw) ? undefined : parseNuptk(nuptkRaw, sourceRow);

    const dpaRaw = row[dpaIndex];
    const dpa = isBlankOrDash(dpaRaw) ? null : cellText(dpaRaw);

    return {
      nim,
      programStudi,
      nuptk,
      dpa,
    };
  });
}
