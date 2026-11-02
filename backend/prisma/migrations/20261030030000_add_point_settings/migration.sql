-- Master pengaturan poin kedisiplinan yang dapat diubah Kemahasiswaan.
-- Hanya menambah tabel/kolom (nullable) sehingga kode lama tetap berjalan.

CREATE TYPE "StatusClearance" AS ENUM ('CLEAR', 'PENDING', 'BELUM_CLEAR');

CREATE TYPE "StatusPoin" AS ENUM ('SANGAT_BAIK', 'BAIK', 'PERLU_PEMBINAAN', 'TINDAK_LANJUT_KHUSUS');

ALTER TYPE "PointChangeType" ADD VALUE 'REPEAT_VIOLATION_PENALTY';
ALTER TYPE "PointChangeType" ADD VALUE 'MANUAL_ADJUSTMENT';

ALTER TABLE "Mahasiswa" ADD COLUMN "Status_Clearance" "StatusClearance";

ALTER TABLE "PerubahanPoin"
    ADD COLUMN "bobotSnapshot" INTEGER,
    ADD COLUMN "referensiLaporanId" INTEGER;

ALTER TABLE "LogAudit"
    ADD COLUMN "alasan" VARCHAR(1000),
    ADD COLUMN "nilaiBaru" JSONB,
    ADD COLUMN "nilaiLama" JSONB;

CREATE TABLE "TingkatPelanggaran" (
    "id" SERIAL NOT NULL,
    "pillar" "DisciplinePillar" NOT NULL,
    "severity" "ViolationSeverity" NOT NULL,
    "bobotPoin" INTEGER NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TingkatPelanggaran_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TingkatPelanggaran_bobotPoin_negatif" CHECK ("bobotPoin" < 0)
);

CREATE TABLE "PengaturanPoin" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "poinAwal" INTEGER NOT NULL DEFAULT 100,
    "poinMinimal" INTEGER NOT NULL DEFAULT 0,
    "poinMaksimal" INTEGER NOT NULL DEFAULT 200,
    "potonganBerulangMin" INTEGER NOT NULL DEFAULT 5,
    "potonganBerulangMaks" INTEGER NOT NULL DEFAULT 10,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PengaturanPoin_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PengaturanPoin_satu_baris" CHECK ("id" = 1)
);

CREATE TABLE "BatasStatusPoin" (
    "kode" "StatusPoin" NOT NULL,
    "label" VARCHAR(100) NOT NULL,
    "batasBawah" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BatasStatusPoin_pkey" PRIMARY KEY ("kode")
);

CREATE UNIQUE INDEX "TingkatPelanggaran_pillar_severity_key" ON "TingkatPelanggaran"("pillar", "severity");

CREATE INDEX "PerubahanPoin_referensiLaporanId_idx" ON "PerubahanPoin"("referensiLaporanId");

ALTER TABLE "PerubahanPoin" ADD CONSTRAINT "PerubahanPoin_referensiLaporanId_fkey" FOREIGN KEY ("referensiLaporanId") REFERENCES "Laporan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Nilai default dari kebijakan kampus.
INSERT INTO "PengaturanPoin" ("id") VALUES (1) ON CONFLICT DO NOTHING;

INSERT INTO "TingkatPelanggaran" ("pillar", "severity", "bobotPoin", "aktif") VALUES
    ('WAKTU', 'RINGAN', -5, true),
    ('WAKTU', 'SEDANG', -10, true),
    ('WAKTU', 'BERAT', -15, true),
    ('WAKTU', 'SANGAT_BERAT', -15, false),
    ('AKADEMIK', 'RINGAN', -10, true),
    ('AKADEMIK', 'SEDANG', -15, true),
    ('AKADEMIK', 'BERAT', -25, true),
    ('AKADEMIK', 'SANGAT_BERAT', -25, false),
    ('TATA_TERTIB', 'RINGAN', -5, true),
    ('TATA_TERTIB', 'SEDANG', -10, true),
    ('TATA_TERTIB', 'BERAT', -15, true),
    ('TATA_TERTIB', 'SANGAT_BERAT', -15, false),
    ('PROSEDUR_K3', 'RINGAN', -10, true),
    ('PROSEDUR_K3', 'SEDANG', -20, true),
    ('PROSEDUR_K3', 'BERAT', -30, true),
    ('PROSEDUR_K3', 'SANGAT_BERAT', -30, false),
    ('LINGKUNGAN', 'RINGAN', -5, true),
    ('LINGKUNGAN', 'SEDANG', -10, true),
    ('LINGKUNGAN', 'BERAT', -15, true),
    ('LINGKUNGAN', 'SANGAT_BERAT', -15, false)
ON CONFLICT ("pillar", "severity") DO NOTHING;

INSERT INTO "BatasStatusPoin" ("kode", "label", "batasBawah") VALUES
    ('SANGAT_BAIK', 'Sangat Baik', 90),
    ('BAIK', 'Baik', 75),
    ('PERLU_PEMBINAAN', 'Perlu Pembinaan', 60),
    ('TINDAK_LANJUT_KHUSUS', 'Tindak Lanjut Khusus', 0)
ON CONFLICT ("kode") DO NOTHING;

-- Tingkat Sangat Berat tidak dipakai kebijakan kampus.
UPDATE "AturanPelanggaran" SET "aktif" = false WHERE "severity" = 'SANGAT_BERAT';
