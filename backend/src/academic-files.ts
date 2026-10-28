import { randomBytes } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import * as XLSX from "xlsx";
import type { UnggahanAkademik } from "@prisma/client";
import { database } from "./db";

export type AcademicFileCategory = "attendance" | "advisors";

export type AcademicUploadRecord = {
  id: string;
  category: AcademicFileCategory;
  fileName: string;
  storedFileName: string;
  fileSize: number;
  uploadedAt: string;
  uploadedBy: string;
  rowCount: number;
  summary: string;
};

const academicUploadsDirectory = resolve(process.cwd(), "uploads", "academic");
const legacyHistoryFilePath = resolve(academicUploadsDirectory, "history.json");

async function ensureDirectory(): Promise<void> {
  await mkdir(academicUploadsDirectory, { recursive: true });
}

function toRecord(row: UnggahanAkademik): AcademicUploadRecord {
  return {
    id: row.id,
    category: row.category as AcademicFileCategory,
    fileName: row.fileName,
    storedFileName: row.storedFileName,
    fileSize: row.fileSize,
    uploadedAt: row.uploadedAt.toISOString(),
    uploadedBy: row.uploadedBy,
    rowCount: row.rowCount,
    summary: row.summary,
  };
}

// Pindahkan riwayat lama dari history.json ke DB satu kali.
let legacyImport: Promise<void> | null = null;
function importLegacyHistory(): Promise<void> {
  legacyImport ??= (async () => {
    let records: AcademicUploadRecord[];
    try {
      const parsed = JSON.parse(await readFile(legacyHistoryFilePath, "utf8"));
      records = Array.isArray(parsed) ? parsed : [];
    } catch {
      return;
    }
    if (records.length > 0) {
      await database.unggahanAkademik.createMany({
        data: records.map((record) => ({
          ...record,
          uploadedAt: new Date(record.uploadedAt),
        })),
        skipDuplicates: true,
      });
    }
    await rename(legacyHistoryFilePath, `${legacyHistoryFilePath}.migrated`);
  })().catch((error) => {
    legacyImport = null;
    throw error;
  });
  return legacyImport;
}

export async function saveAcademicUpload(params: {
  category: AcademicFileCategory;
  fileName: string;
  buffer: Buffer;
  uploadedBy: string;
  rowCount: number;
  summary: string;
}): Promise<AcademicUploadRecord> {
  await ensureDirectory();
  const id = `${Date.now()}-${randomBytes(4).toString("hex")}`;
  const safeOriginalName = params.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200);
  const storedFileName = `${id}-${safeOriginalName}`;
  const targetPath = resolve(academicUploadsDirectory, storedFileName);

  await writeFile(targetPath, params.buffer);

  const row = await database.unggahanAkademik.create({
    data: {
      id,
      category: params.category,
      fileName: params.fileName.slice(0, 255),
      storedFileName,
      fileSize: params.buffer.length,
      uploadedBy: params.uploadedBy.slice(0, 255),
      rowCount: params.rowCount,
      summary: params.summary.slice(0, 500),
    },
  });
  return toRecord(row);
}

export async function listAcademicUploads(
  category?: AcademicFileCategory,
): Promise<AcademicUploadRecord[]> {
  await importLegacyHistory();
  const rows = await database.unggahanAkademik.findMany({
    where: category ? { category } : {},
    orderBy: { uploadedAt: "desc" },
  });
  return rows.map(toRecord);
}

export async function getAcademicUploadRecord(
  id: string,
): Promise<AcademicUploadRecord | null> {
  await importLegacyHistory();
  const row = await database.unggahanAkademik.findUnique({ where: { id } });
  return row ? toRecord(row) : null;
}

export function isValidAttendancePreviewRow(
  headers: string[],
  row: unknown[],
): boolean {
  const normalizedHeaders = headers.map((header) =>
    header
      .replace(/^\uFEFF/, "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, ""),
  );
  // Alias berurutan agar "Jumlah Kehadiran" menang atas kolom "Kehadiran".
  const findColumn = (...aliases: string[]) => {
    for (const alias of aliases) {
      const index = normalizedHeaders.indexOf(alias);
      if (index !== -1) return index;
    }
    return -1;
  };
  const columns = [
    findColumn("mata_kuliah", "matakuliah", "mata_kuliah_kegiatan", "mk", "matkul"),
    findColumn("kelas"),
    findColumn("nim"),
    findColumn("nama_mahasiswa", "namamahasiswa", "nama_lengkap", "nama"),
    findColumn("jumlah_kehadiran", "jumlahkehadiran", "kehadiran", "hadir"),
  ];
  if (columns.some((index) => index < 0)) {
    return true;
  }

  const [courseIndex, classIndex, nimIndex, nameIndex, attendanceIndex] = columns;
  const requiredValues = [row[courseIndex], row[classIndex], row[nameIndex]]
    .map((value) => String(value ?? "").trim());
  const nim = String(row[nimIndex] ?? "").trim().replace(/\.0+$/, "");
  const attendance = String(row[attendanceIndex] ?? "").trim();
  return (
    requiredValues.every((value) => value && !/^[-–—]+$/.test(value)) &&
    /^[1-9]\d*$/.test(nim) &&
    Number.isSafeInteger(Number(nim)) &&
    /^\d+$/.test(attendance) &&
    Number.isSafeInteger(Number(attendance))
  );
}

export async function getAcademicUploadPreview(id: string): Promise<{
  record: AcademicUploadRecord;
  headers: string[];
  rows: Array<Record<string, string>>;
  totalRows: number;
} | null> {
  const record = await getAcademicUploadRecord(id);
  if (!record) {
    return null;
  }

  const filePath = resolve(academicUploadsDirectory, record.storedFileName);
  let buffer: Buffer;
  try {
    buffer = await readFile(filePath);
  } catch {
    return null;
  }

  const workbook = XLSX.read(buffer, { type: "buffer", raw: false });
  const sheetName = workbook.SheetNames[0];
  const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;
  if (!sheet) {
    return { record, headers: [], rows: [], totalRows: 0 };
  }

  const rawRows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    blankrows: false,
    defval: "",
  });

  if (rawRows.length === 0) {
    return { record, headers: [], rows: [], totalRows: 0 };
  }

  const headerRow = (rawRows[0] || []).map((h) => String(h ?? "").trim());
  const validHeaders = headerRow.map((h, i) => (h ? h : `Kolom_${i + 1}`));

  const dataRows: Array<Record<string, string>> = [];
  for (let idx = 1; idx < rawRows.length; idx++) {
    const row = rawRows[idx];
    const hasData = row?.some((val) => {
      const value = String(val ?? "").trim();
      return value !== "" &&
        (record.category !== "attendance" || !/^[-–—]+$/.test(value));
    });
    if (!hasData) {
      continue;
    }
    if (record.category === "attendance" && !isValidAttendancePreviewRow(headerRow, row)) {
      continue;
    }
    const rowObj: Record<string, string> = { _rowIndex: String(idx) };
    validHeaders.forEach((colName, colIdx) => {
      rowObj[colName] = String(row[colIdx] ?? "").trim();
    });
    dataRows.push(rowObj);
  }

  return {
    record,
    headers: validHeaders,
    rows: dataRows,
    totalRows: dataRows.length,
  };
}

export async function getAcademicUploadFilePath(
  id: string,
): Promise<{ record: AcademicUploadRecord; absolutePath: string } | null> {
  const record = await getAcademicUploadRecord(id);
  if (!record) {
    return null;
  }
  const absolutePath = resolve(academicUploadsDirectory, record.storedFileName);
  return { record, absolutePath };
}
