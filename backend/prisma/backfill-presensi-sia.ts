// Mengisi kolom Sakit, Ijin, dan Alpa di PresensiAkademik dari file absensi
// yang sudah pernah diunggah (sebelum kolom tersebut ada). File diproses dari
// yang terlama ke terbaru, sehingga data unggahan terakhir yang berlaku.
// Hanya memperbarui baris yang Mata Kuliah, Kelas, NIM, dan Jumlah Kehadirannya
// masih sama dengan isi file; poin mahasiswa tidak disentuh.
import "dotenv/config";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { parseAcademicAttendanceFile } from "../src/academic-import";

const database = new PrismaClient();
const uploadsDirectory = resolve(process.cwd(), "uploads", "academic");

async function main() {
  const uploads = await database.unggahanAkademik.findMany({
    where: { category: "attendance" },
    orderBy: { uploadedAt: "asc" },
    select: { fileName: true, storedFileName: true },
  });

  let updated = 0;
  for (const upload of uploads) {
    let buffer: Buffer;
    try {
      buffer = await readFile(resolve(uploadsDirectory, upload.storedFileName));
    } catch {
      console.warn(`Lewati "${upload.fileName}": file tidak ditemukan.`);
      continue;
    }

    let rows;
    try {
      rows = parseAcademicAttendanceFile(buffer, upload.fileName);
    } catch (error) {
      console.warn(`Lewati "${upload.fileName}": ${error instanceof Error ? error.message : error}`);
      continue;
    }

    for (const row of rows) {
      const result = await database.presensiAkademik.updateMany({
        where: {
          mataKuliah: row.mataKuliah,
          kelas: row.kelas,
          nim: row.nim,
          jumlahKehadiran: row.jumlahKehadiran,
        },
        data: { sakit: row.sakit, ijin: row.ijin, alpa: row.alpa },
      });
      updated += result.count;
    }
    console.log(`"${upload.fileName}": ${rows.length} baris diproses.`);
  }

  console.log(`Selesai. ${updated} baris presensi diperbarui.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => database.$disconnect());
