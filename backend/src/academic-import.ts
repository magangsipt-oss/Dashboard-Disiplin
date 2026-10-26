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
  nip?: string;
  dpa?: string;
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

function readSheetMatrix(buffer: Buffer, fileName: string): unknown[][] {
  const extension = fileName.toLowerCase().split(".").pop();
  if (extension !== "csv" && extension !== "xlsx") {
    throw new AcademicImportValidationError(
      "Format file harus CSV atau Excel (.xlsx).",
    );
  }

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: "buffer", raw: true });
  } catch {
    throw new AcademicImportValidationError(
      "File tidak dapat dibaca. Pastikan file CSV atau Excel (.xlsx) valid.",
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

function readRows(buffer: Buffer, fileName: string, requiredHeaders: string[]) {
  const matrix = readSheetMatrix(buffer, fileName);
  const headerRow = matrix[0];
  if (!headerRow) {
    throw new AcademicImportValidationError("File tidak memiliki baris judul kolom.");
  }

  const headers = headerRow.map(normalizeHeader);
  const missingHeaders = requiredHeaders.filter(
    (header) => !headers.includes(header),
  );
  if (missingHeaders.length > 0) {
    throw new AcademicImportValidationError(
      `Kolom wajib tidak ditemukan: ${missingHeaders.join(", ")}.`,
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

  const column = (header: string) => headers.indexOf(header);
  return { records, column };
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

function parseNip(value: unknown, sourceRow: number): string {
  const text = cellText(value).replace(/\.0+$/, "");
  if (!/^[1-9]\d*$/.test(text)) {
    throw new AcademicImportValidationError(
      `NIP pada baris ${sourceRow} harus berupa angka bulat positif.`,
    );
  }
  const nip = BigInt(text);
  if (nip > MAX_POSTGRES_BIGINT) {
    throw new AcademicImportValidationError(
      `NIP pada baris ${sourceRow} melebihi batas angka yang didukung.`,
    );
  }
  return text;
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

  // Look for NIP / NUPTK column
  const possibleNipHeaders = ["nip", "nuptk", "nidn"];
  const nipIndex = headers.findIndex((h) => possibleNipHeaders.includes(h));

  if (dpaIndex === -1 && nipIndex === -1) {
    throw new AcademicImportValidationError(
      "Kolom DPA atau NIP tidak ditemukan pada file pembagian. Cantumkan kolom 'DPA' (nama dosen) atau 'NIP'.",
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
    const nipText = nipIndex !== -1 ? cellText(row[nipIndex]) : "";

    if (!dpaText && !nipText) {
      throw new AcademicImportValidationError(
        `DPA atau NIP wajib diisi pada baris ${sourceRow}.`,
      );
    }

    const record = {
      nim,
      programStudi,
      nip: nipText ? parseNip(nipText, sourceRow) : undefined,
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
