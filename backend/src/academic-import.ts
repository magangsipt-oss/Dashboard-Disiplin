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
  dpa?: string;
};

export type NewStudentImportRow = {
  nim: number;
  nama: string;
  jurusan: string;
  password: string;
  email: string;
  noHandphone: string;
  angkatan?: number;
  namaSmta?: string;
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

function findColumn(headers: string[], aliases: string[]): number {
  return headers.findIndex((header) => aliases.includes(header));
}

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
  const columns = {
    nim: findColumn(headers, ["nim"]),
    nama: findColumn(headers, ["nama_lengkap", "nama_mahasiswa", "nama"]),
    jurusan: findColumn(headers, ["prodi", "program_studi", "jurusan"]),
    password: findColumn(headers, ["kata_sandi", "password", "password_awal"]),
    email: findColumn(headers, ["email"]),
    noHandphone: findColumn(headers, ["no_handphone", "nomor_handphone", "no_hp", "telepon"]),
    angkatan: findColumn(headers, ["angkatan", "tahun_masuk"]),
    namaSmta: findColumn(headers, ["nama_smta", "asal_sekolah"]),
  };
  const required = [
    ["NIM", columns.nim],
    ["Nama Lengkap", columns.nama],
    ["PRODI", columns.jurusan],
    ["Email", columns.email],
    ["No Handphone", columns.noHandphone],
    ["Kata Sandi", columns.password],
  ] as const;
  const missing = required.filter(([, column]) => column === -1);
  if (missing.length > 0) {
    throw new AcademicImportValidationError(
      `Kolom wajib tidak ditemukan: ${missing.map(([label]) => label).join(", ")}.`,
    );
  }

  const seenNims = new Set<number>();
  return records.map(({ row, sourceRow }) => {
    const nim = parseNim(row[columns.nim], sourceRow);
    if (seenNims.has(nim)) {
      throw new AcademicImportValidationError(
        `NIM ${nim} muncul lebih dari sekali pada file mahasiswa.`,
      );
    }
    seenNims.add(nim);

    const nama = cellText(row[columns.nama]);
    const jurusan = cellText(row[columns.jurusan]);
    if (!nama || !jurusan) {
      throw new AcademicImportValidationError(
        `Nama Lengkap dan PRODI wajib diisi pada baris ${sourceRow}.`,
      );
    }

    const emailText = cellText(row[columns.email]);
    const phone = cellText(row[columns.noHandphone]);
    if (!emailText || !phone) {
      throw new AcademicImportValidationError(
        `Email dan No Handphone wajib diisi pada baris ${sourceRow}.`,
      );
    }
    const school = columns.namaSmta === -1 ? "" : cellText(row[columns.namaSmta]);
    const angkatanText = columns.angkatan === -1 ? "" : cellText(row[columns.angkatan]);
    let angkatan: number | undefined;
    if (angkatanText) {
      angkatan = Number(angkatanText.replace(/\.0+$/, ""));
      if (!Number.isInteger(angkatan) || angkatan < 1900 || angkatan > 2100) {
        throw new AcademicImportValidationError(
          `Angkatan pada baris ${sourceRow} harus berupa tahun yang valid.`,
        );
      }
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
      password: parseImportPassword(row[columns.password], sourceRow),
      email: parseEmail(emailText, sourceRow),
      noHandphone: phone,
      angkatan,
      namaSmta: school || undefined,
    };
  });
}

export function parseNewLecturerImportFile(
  buffer: Buffer,
  fileName: string,
): NewLecturerImportRow[] {
  const { headers, records } = readImportRecords(buffer, fileName);
  const columns = {
    nuptk: findColumn(headers, ["nuptk"]),
    nama: findColumn(headers, ["nama_lengkap", "nama_dosen", "nama"]),
    email: findColumn(headers, ["email"]),
    password: findColumn(headers, ["kata_sandi", "password", "password_awal"]),
  };
  const required = [
    ["NUPTK", columns.nuptk],
    ["Nama", columns.nama],
    ["Email", columns.email],
    ["Kata Sandi", columns.password],
  ] as const;
  const missing = required.filter(([, column]) => column === -1);
  if (missing.length > 0) {
    throw new AcademicImportValidationError(
      `Kolom wajib tidak ditemukan: ${missing.map(([label]) => label).join(", ")}.`,
    );
  }

  const seenNuptks = new Set<string>();
  const seenEmails = new Set<string>();
  return records.map(({ row, sourceRow }) => {
    const nuptk = parseImportBigInt(row[columns.nuptk], "NUPTK", sourceRow);
    const email = parseEmail(row[columns.email], sourceRow);
    const nama = cellText(row[columns.nama]);
    if (!nama) {
      throw new AcademicImportValidationError(
        `Nama wajib diisi pada baris ${sourceRow}.`,
      );
    }

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
      password: parseImportPassword(row[columns.password], sourceRow),
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
  const findCol = (...aliases: string[]) => headers.findIndex((h) => aliases.includes(h));

  const mataKuliahIndex = findCol("mata_kuliah", "matakuliah", "mata_kuliah_kegiatan", "mk", "matkul");
  const kelasIndex = findCol("kelas");
  const nimIndex = findCol("nim");
  const namaMahasiswaIndex = findCol("nama_mahasiswa", "namamahasiswa", "nama_lengkap", "nama");
  const jumlahKehadiranIndex = findCol("jumlah_kehadiran", "jumlahkehadiran", "kehadiran", "hadir");
  const alpaIndex = findCol("alpa", "alpha", "tanpa_keterangan", "a");
  const ijinIndex = findCol("ijin", "izin", "i");
  const sakitIndex = findCol("sakit", "s");

  const missing: string[] = [];
  if (mataKuliahIndex === -1) missing.push("mata_kuliah");
  if (kelasIndex === -1) missing.push("kelas");
  if (nimIndex === -1) missing.push("nim");
  if (namaMahasiswaIndex === -1) missing.push("nama_mahasiswa");
  if (jumlahKehadiranIndex === -1) missing.push("jumlah_kehadiran");

  if (missing.length > 0) {
    throw new AcademicImportValidationError(
      `Kolom wajib tidak ditemukan: ${missing.join(", ")}.`,
    );
  }

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
    const mataKuliah = cellText(row[mataKuliahIndex]);
    const kelas = cellText(row[kelasIndex]);
    const namaMahasiswa = cellText(row[namaMahasiswaIndex]);
    const attendanceText = cellText(row[jumlahKehadiranIndex]);
    const jumlahKehadiran = Number(attendanceText);
    const nim = parseNim(row[nimIndex], sourceRow);
    const key = `${mataKuliah}::${kelas}::${nim}`;
    const existingName = seenNimNames.get(key);

    if (existingName && existingName !== namaMahasiswa) {
      throw new AcademicImportValidationError(
        `NIM ${nim} pada mata kuliah "${mataKuliah}" dan kelas "${kelas}" muncul dengan nama yang berbeda: "${existingName}" dan "${namaMahasiswa}". Gunakan NIM sebagai identitas utama untuk pengurangan poin.`,
      );
    }
    seenNimNames.set(key, namaMahasiswa);

    if (!mataKuliah || !kelas || !namaMahasiswa) {
      throw new AcademicImportValidationError(
        `Mata_Kuliah, Kelas, dan Nama_Mahasiswa wajib diisi pada baris ${sourceRow}.`,
      );
    }
    if (!/^\d+$/.test(attendanceText) || !Number.isSafeInteger(jumlahKehadiran)) {
      throw new AcademicImportValidationError(
        `Jumlah_Kehadiran pada baris ${sourceRow} harus berupa angka bulat nol atau lebih.`,
      );
    }

    let alpa = 0;
    if (alpaIndex !== -1) {
      const rawAlpa = cellText(row[alpaIndex]);
      if (rawAlpa && /^\d+$/.test(rawAlpa)) {
        alpa = Number(rawAlpa);
      }
    }

    let ijin = 0;
    if (ijinIndex !== -1) {
      const rawIjin = cellText(row[ijinIndex]);
      if (rawIjin && /^\d+$/.test(rawIjin)) {
        ijin = Number(rawIjin);
      }
    }

    let sakit = 0;
    if (sakitIndex !== -1) {
      const rawSakit = cellText(row[sakitIndex]);
      if (rawSakit && /^\d+$/.test(rawSakit)) {
        sakit = Number(rawSakit);
      }
    }

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
  const nimIndex = headers.indexOf("nim");
  if (nimIndex === -1) {
    throw new AcademicImportValidationError(
      "Kolom wajib 'NIM' tidak ditemukan pada file pembagian.",
    );
  }

  const programStudiIndex = headers.findIndex((header) =>
    ["program_studi", "prodi", "jurusan"].includes(header),
  );
  if (programStudiIndex === -1) {
    throw new AcademicImportValidationError(
      "Kolom wajib 'Program Studi' tidak ditemukan pada file pembagian.",
    );
  }

  // Look for DPA column (e.g. 'dpa', 'dosen_pa', 'nama_dosen', 'dosen', 'dpa_nama')
  const possibleDpaHeaders = ["dpa", "dosen_pa", "nama_dosen", "dosen", "dpa_nama"];
  const dpaIndex = headers.findIndex((h) => possibleDpaHeaders.includes(h));

  const nuptkIndex = headers.indexOf("nuptk");

  if (dpaIndex === -1 && nuptkIndex === -1) {
    throw new AcademicImportValidationError(
      "Kolom DPA atau NUPTK tidak ditemukan pada file pembagian. Cantumkan kolom 'DPA' (nama dosen) atau 'NUPTK'.",
    );
  }

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

    const dpaText = dpaIndex !== -1 ? cellText(row[dpaIndex]) : "";
    const nuptkText = nuptkIndex !== -1 ? cellText(row[nuptkIndex]) : "";

    if (!dpaText && !nuptkText) {
      throw new AcademicImportValidationError(
        `DPA atau NUPTK wajib diisi pada baris ${sourceRow}.`,
      );
    }

    const record = {
      nim,
      programStudi,
      nuptk: nuptkText ? parseNuptk(nuptkText, sourceRow) : undefined,
    } as AdvisorAssignmentRow;

    if (dpaText) {
      Object.defineProperty(record, "dpa", {
        value: dpaText,
        enumerable: true,
        writable: true,
        configurable: true,
      });
    }

    return record;
  });
}
