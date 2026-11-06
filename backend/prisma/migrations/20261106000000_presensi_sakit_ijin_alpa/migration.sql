-- Simpan Sakit, Ijin, dan Alpa per mata kuliah agar tingkat kehadiran
-- mahasiswa dapat dihitung dari total pertemuan.
ALTER TABLE "PresensiAkademik" ADD COLUMN "Sakit" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PresensiAkademik" ADD COLUMN "Ijin" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PresensiAkademik" ADD COLUMN "Alpa" INTEGER NOT NULL DEFAULT 0;
