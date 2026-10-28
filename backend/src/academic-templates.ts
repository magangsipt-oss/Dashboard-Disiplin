import * as XLSX from "xlsx";

export type AcademicTemplate = {
  title: string;
  fileName: string;
  sheetName: string;
  headers: string[];
  requiredHeaders: string[];
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
    requiredHeaders: ["Matakuliah", "Kelas", "NIM", "Nama Mahasiswa", "Jumlah Kehadiran"],
    rows: [["1", "Kepelabuhan", "SBC2005-1", "23401024", "Abin Nabawi", "0", "0", "0", "0", "0"]],
  },
  students: {
    title: "Template Data Mahasiswa",
    fileName: "Template Mahasiswa.xlsx",
    sheetName: "Data Mahasiswa",
    headers: ["No.", "NIM", "Nama Lengkap", "Program Studi", "Angkatan", "Nama SMTA", "Email", "No Handphone", "Kata Sandi"],
    requiredHeaders: ["NIM", "Nama Lengkap", "Program Studi", "Email", "No Handphone", "Kata Sandi"],
    rows: [["1", "23401024", "Abin Nabawi", "Teknologi Rekayasa Logistik", "2023", "SMAN 5 BERAU", "abin.nabawi@gmail.com", "081234567890", "Abin2324"]],
  },
  lecturers: {
    title: "Template Data Dosen",
    fileName: "Template Dosen.xlsx",
    sheetName: "Data Dosen",
    headers: ["No", "Nama Dosen", "Email", "NUPTK", "PRODI", "Password"],
    requiredHeaders: ["Nama Dosen", "Email", "NUPTK", "Password"],
    rows: [["1", "Abin Nabawi", "abin.nabawi@gmail.com", "9954763664230202", "Teknologi Rekayasa Logistik", "Abin@poltek"]],
  },
  "advisor-assignments": {
    title: "Template Pembagian DPA",
    fileName: "Template Pembagian DPA.xlsx",
    sheetName: "Data Pembagian DPA",
    headers: ["No.", "NIM", "Nama Lengkap", "Program Studi", "Angkatan", "DPA"],
    requiredHeaders: ["NIM", "Program Studi", "DPA"],
    rows: [["1", "23401024", "Abin Nabawi", "Teknologi Rekayasa Logistik", "2023", "Hamim Rachman, S.T., M.T."]],
  },
};

export function buildTemplateWorkbook(template: AcademicTemplate): Buffer {
  const sheet = XLSX.utils.aoa_to_sheet([template.headers, ...template.rows]);
  // Semua sel teks supaya NIM, NUPTK, dan nol di depan No Handphone tidak berubah.
  for (const [address, cell] of Object.entries(sheet)) {
    if (address.startsWith("!")) continue;
    cell.t = "s";
    cell.z = "@";
  }
  sheet["!cols"] = template.headers.map((header, column) => ({
    wch: Math.max(header.length, ...template.rows.map((row) => row[column]?.length ?? 0)) + 2,
  }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, template.sheetName);
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}
