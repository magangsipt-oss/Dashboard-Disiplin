-- Setiap 3 hari keterlambatan punishment menambah satu punishment tambahan.
ALTER TABLE "Pembinaan" ADD COLUMN "pembinaanAsalId" INTEGER;

CREATE INDEX "Pembinaan_pembinaanAsalId_idx" ON "Pembinaan"("pembinaanAsalId");

ALTER TABLE "Pembinaan"
    ADD CONSTRAINT "Pembinaan_pembinaanAsalId_fkey"
    FOREIGN KEY ("pembinaanAsalId") REFERENCES "Pembinaan"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
