ALTER TABLE "Laporan" ADD COLUMN "ditelusuriPada" TIMESTAMP(3);

-- Laporan yang sudah pernah ditelusuri Kemahasiswaan tercatat di log audit.
UPDATE "Laporan" AS l
SET "ditelusuriPada" = a."createdAt"
FROM (
    SELECT "entitasId", MIN("createdAt") AS "createdAt"
    FROM "LogAudit"
    WHERE "aksi" = 'LAPORAN_DIRUTEKAN' AND "entitas" = 'Laporan'
    GROUP BY "entitasId"
) AS a
WHERE l."id" = a."entitasId";

CREATE INDEX "Laporan_ditelusuriPada_idx" ON "Laporan"("ditelusuriPada");
