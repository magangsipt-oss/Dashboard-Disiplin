CREATE TYPE "JenisKlaimKegiatan" AS ENUM ('LOMBA', 'KEGIATAN_NON_AKADEMIK');

CREATE TYPE "TingkatKegiatan" AS ENUM (
    'KAMPUS',
    'KABUPATEN_KOTA',
    'PROVINSI',
    'NASIONAL',
    'INTERNASIONAL'
);

CREATE TYPE "StatusKlaimKegiatan" AS ENUM ('DIAJUKAN', 'DISETUJUI', 'DITOLAK');

CREATE TABLE "BuktiFoto" (
    "fileName" VARCHAR(64) NOT NULL,
    "mimeType" VARCHAR(20) NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BuktiFoto_pkey" PRIMARY KEY ("fileName")
);

CREATE TABLE "KlaimKegiatan" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "jenis" "JenisKlaimKegiatan" NOT NULL,
    "namaKegiatan" VARCHAR(200) NOT NULL,
    "penyelenggara" VARCHAR(200) NOT NULL,
    "tingkat" "TingkatKegiatan" NOT NULL,
    "capaian" VARCHAR(100) NOT NULL,
    "tanggalKegiatan" DATE NOT NULL,
    "deskripsi" VARCHAR(1000),
    "buktiFileName" VARCHAR(64) NOT NULL,
    "status" "StatusKlaimKegiatan" NOT NULL DEFAULT 'DIAJUKAN',
    "poinDisetujui" INTEGER,
    "catatanPemeriksa" VARCHAR(1000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "perubahanPoinId" INTEGER,

    CONSTRAINT "KlaimKegiatan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "KlaimKegiatan_perubahanPoinId_key"
    ON "KlaimKegiatan"("perubahanPoinId");

CREATE INDEX "KlaimKegiatan_studentId_createdAt_idx"
    ON "KlaimKegiatan"("studentId", "createdAt");

CREATE INDEX "KlaimKegiatan_status_createdAt_idx"
    ON "KlaimKegiatan"("status", "createdAt");

ALTER TABLE "KlaimKegiatan"
    ADD CONSTRAINT "KlaimKegiatan_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "Mahasiswa"("ID")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "KlaimKegiatan"
    ADD CONSTRAINT "KlaimKegiatan_perubahanPoinId_fkey"
    FOREIGN KEY ("perubahanPoinId") REFERENCES "PerubahanPoin"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
