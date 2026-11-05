-- Kegiatan DRC (Disiplin Refresh Competency) yang dikelola Kemahasiswaan.
-- Hanya menambah tabel baru sehingga kode lama tetap berjalan.

CREATE TYPE "JenisKegiatanDrc" AS ENUM ('SEMINAR', 'KEGIATAN_LAIN');

CREATE TABLE "KegiatanDrc" (
    "id" SERIAL NOT NULL,
    "judul" VARCHAR(200) NOT NULL,
    "jenis" "JenisKegiatanDrc" NOT NULL,
    "semester" VARCHAR(50) NOT NULL,
    "tanggal" DATE NOT NULL,
    "jamMulai" VARCHAR(5) NOT NULL,
    "jamSelesai" VARCHAR(5) NOT NULL,
    "lokasi" VARCHAR(200) NOT NULL,
    "tema" "DisciplinePillar"[],
    "deskripsi" VARCHAR(2000),
    "dibuatOleh" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KegiatanDrc_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "KegiatanDrc_tanggal_idx" ON "KegiatanDrc"("tanggal");
