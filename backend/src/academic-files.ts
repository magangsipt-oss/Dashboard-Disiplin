import { randomBytes } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import * as XLSX from "xlsx";

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
const historyFilePath = resolve(academicUploadsDirectory, "history.json");

async function ensureDirectory(): Promise<void> {
  await mkdir(academicUploadsDirectory, { recursive: true });
}

async function loadHistory(): Promise<AcademicUploadRecord[]> {
  await ensureDirectory();
  try {
    const content = await readFile(historyFilePath, "utf8");
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      return parsed as AcademicUploadRecord[];
    }
    return [];
  } catch {
    // If history file doesn't exist yet, try to auto-seed with data-pembagian-dpa.csv if available
    const initialRecords: AcademicUploadRecord[] = [];
    try {
      const seedCsvPath = resolve(process.cwd(), "prisma", "data-pembagian-dpa.csv");
      const seedBuffer = await readFile(seedCsvPath);
      const seedId = "init-pembagian-dpa";
      const storedFileName = `${seedId}-data-pembagian-dpa.csv`;
      const targetPath = resolve(academicUploadsDirectory, storedFileName);
      await writeFile(targetPath, seedBuffer);
      const fileStats = await stat(targetPath);
      initialRecords.push({
        id: seedId,
        category: "advisors",
        fileName: "data-pembagian-dpa.csv",
        storedFileName,
        fileSize: fileStats.size,
        uploadedAt: new Date().toISOString(),
        uploadedBy: "Akademik Poltek Simas Berau",
        rowCount: 67,
        summary: "67 mahasiswa dibagikan",
      });
      await writeFile(historyFilePath, JSON.stringify(initialRecords, null, 2), "utf8");
    } catch {
      // ignore seed failure if file not found
    }
    return initialRecords;
  }
}

async function saveHistory(records: AcademicUploadRecord[]): Promise<void> {
  await ensureDirectory();
  await writeFile(historyFilePath, JSON.stringify(records, null, 2), "utf8");
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
  const safeOriginalName = params.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storedFileName = `${id}-${safeOriginalName}`;
  const targetPath = resolve(academicUploadsDirectory, storedFileName);

  await writeFile(targetPath, params.buffer);

  const newRecord: AcademicUploadRecord = {
    id,
    category: params.category,
    fileName: params.fileName,
    storedFileName,
    fileSize: params.buffer.length,
    uploadedAt: new Date().toISOString(),
    uploadedBy: params.uploadedBy,
    rowCount: params.rowCount,
    summary: params.summary,
  };

  const records = await loadHistory();
  records.unshift(newRecord);
  await saveHistory(records);

  return newRecord;
}

export async function listAcademicUploads(
  category?: AcademicFileCategory,
): Promise<AcademicUploadRecord[]> {
  const records = await loadHistory();
  if (category) {
    return records.filter((r) => r.category === category);
  }
  return records;
}

export async function getAcademicUploadRecord(
  id: string,
): Promise<AcademicUploadRecord | null> {
  const records = await loadHistory();
  return records.find((r) => r.id === id) ?? null;
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
  const findColumn = (...aliases: string[]) =>
    normalizedHeaders.findIndex((header) => aliases.includes(header));
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
