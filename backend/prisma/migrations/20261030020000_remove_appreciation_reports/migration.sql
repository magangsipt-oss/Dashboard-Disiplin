-- Laporan apresiasi dihapus: semua laporan adalah temuan pelanggaran.
-- Gagal (dan tidak mengubah apa pun) bila masih ada baris APRESIASI.
ALTER TYPE "JenisLaporan" RENAME TO "JenisLaporan_old";
CREATE TYPE "JenisLaporan" AS ENUM ('TEMUAN');
ALTER TABLE "Laporan"
    ALTER COLUMN "jenis" TYPE "JenisLaporan" USING ("jenis"::text::"JenisLaporan"),
    ALTER COLUMN "jenis" SET DEFAULT 'TEMUAN';
DROP TYPE "JenisLaporan_old";
