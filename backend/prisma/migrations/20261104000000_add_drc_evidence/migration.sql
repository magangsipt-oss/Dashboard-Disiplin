-- Bukti kehadiran mahasiswa di kegiatan DRC (satu per mahasiswa per kegiatan).

-- CreateTable
CREATE TABLE "BuktiDrc" (
    "id" SERIAL NOT NULL,
    "kegiatanId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    "buktiFileName" VARCHAR(64) NOT NULL,
    "catatan" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuktiDrc_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BuktiDrc_kegiatanId_studentId_key" ON "BuktiDrc"("kegiatanId", "studentId");

-- CreateIndex
CREATE INDEX "BuktiDrc_studentId_idx" ON "BuktiDrc"("studentId");

-- AddForeignKey
ALTER TABLE "BuktiDrc" ADD CONSTRAINT "BuktiDrc_kegiatanId_fkey" FOREIGN KEY ("kegiatanId") REFERENCES "KegiatanDrc"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuktiDrc" ADD CONSTRAINT "BuktiDrc_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Mahasiswa"("ID") ON DELETE CASCADE ON UPDATE CASCADE;
