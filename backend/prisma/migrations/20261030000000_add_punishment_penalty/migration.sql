ALTER TYPE "PointChangeType" ADD VALUE 'PUNISHMENT_PENALTY';

ALTER TABLE "Pembinaan"
    ADD COLUMN "batasWaktu" DATE,
    ADD COLUMN "dendaDihitungSampai" DATE,
    ADD COLUMN "hariDenda" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "totalDenda" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "Pembinaan_status_batasWaktu_idx"
    ON "Pembinaan"("status", "batasWaktu");
