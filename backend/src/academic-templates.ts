// xlsx-js-style: SheetJS yang bisa menulis font dan garis tabel (xlsx biasa tidak).
import * as XLSX from "xlsx-js-style";

export type AcademicTemplate = {
  title: string;
  fileName: string;
  sheetName: string;
  headers: string[];
  rows: string[][];
};

// Template dibuat dari kode agar tetap tersedia walau file contoh di folder backend dihapus.
// Isi diambil dari file "Tamplate *.xlsx" yang disiapkan tim Akademik.
export const academicTemplates: Record<string, AcademicTemplate> = {
  attendance: {
    title: "Template Absensi",
    fileName: "Template Absensi.xlsx",
    sheetName: "Absensi Mahasiswa",
    headers: ["NO", "Matakuliah", "Kelas", "NIM", "Nama Mahasiswa", "Jumlah Kehadiran", "Kehadiran", "Sakit", "Ijin", "Alpa"],
    rows: [["1", "Kepelabuhan", "SBC2005-1", "23401024", "Abin Nabawi", "0", "0", "0", "0", "0"]],
  },
  students: {
    title: "Template Data Mahasiswa",
    fileName: "Template Mahasiswa.xlsx",
    sheetName: "Data Mahasiswa",
    headers: ["No.", "NIM", "Nama Lengkap", "Program Studi", "Angkatan", "Nama SMTA", "Email", "No Handphone", "Kata Sandi"],
    rows: [["1", "23401024", "Abin Nabawi", "Teknologi Rekayasa Logistik", "2023", "SMAN 5 BERAU", "abin.nabawi@gmail.com", "081234567890", "Abin2324"]],
  },
  lecturers: {
    title: "Template Data Dosen",
    fileName: "Template Dosen.xlsx",
    sheetName: "Data Dosen",
    headers: ["No", "Nama Dosen", "Email", "NUPTK", "PRODI", "Password"],
    rows: [["1", "Abin Nabawi", "abin.nabawi@gmail.com", "9954763664230202", "Teknologi Rekayasa Logistik", "Abin@poltek"]],
  },
  "advisor-assignments": {
    title: "Template Pembagian DPA",
    fileName: "Template Pembagian DPA.xlsx",
    sheetName: "Data Pembagian DPA",
    headers: ["No.", "NIM", "Nama Lengkap", "Program Studi", "Angkatan", "DPA"],
    rows: [["1", "23401024", "Abin Nabawi", "Teknologi Rekayasa Logistik", "2023", "Hamim Rachman, S.T., M.T."]],
  },
};

// Kolom teks panjang rata kiri seperti file template Akademik; kolom lain rata tengah.
const leftAlignedHeaders = new Set([
  "Matakuliah",
  "Nama Mahasiswa",
  "Nama Lengkap",
  "Program Studi",
  "Nama Dosen",
  "PRODI",
  "DPA",
]);

const thinBorder = { style: "thin", color: { rgb: "000000" } };
const cellBorder = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };

export function buildTemplateWorkbook(template: AcademicTemplate): Buffer {
  const sheet = XLSX.utils.aoa_to_sheet([template.headers, ...template.rows]);
  // Semua sel teks supaya NIM, NUPTK, dan nol di depan No Handphone tidak berubah.
  // Format mengikuti file template Akademik: Tahoma 8, header tebal, bergaris tabel.
  for (const [address, cell] of Object.entries(sheet)) {
    if (address.startsWith("!")) continue;
    const { r: row, c: column } = XLSX.utils.decode_cell(address);
    const isHeader = row === 0;
    cell.t = "s";
    cell.z = "@";
    cell.s = {
      font: { name: "Tahoma", sz: 8, bold: isHeader },
      alignment: {
        horizontal: !isHeader && leftAlignedHeaders.has(template.headers[column]) ? "left" : "center",
        vertical: "center",
      },
      border: cellBorder,
      numFmt: "@",
    };
  }
  sheet["!cols"] = template.headers.map((header, column) => ({
    wch: Math.max(header.length, ...template.rows.map((row) => row[column]?.length ?? 0)) + 2,
  }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, template.sheetName);
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}
