-- CreateEnum
CREATE TYPE "AdvisorRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CounselingRecordType" AS ENUM ('GUIDANCE_NOTE', 'COUNSELING_CALL');

-- CreateEnum
CREATE TYPE "PointChangeType" AS ENUM ('LATE', 'UNEXCUSED_ABSENCE', 'DISCIPLINE_VIOLATION', 'COMPETITION', 'NON_ACADEMIC_ACTIVITY', 'REPORTED_VIOLATION', 'POINT_RESTORATION');

-- CreateEnum
CREATE TYPE "DisciplinePillar" AS ENUM ('WAKTU', 'AKADEMIK', 'TATA_TERTIB', 'PROSEDUR_K3', 'LINGKUNGAN');

-- CreateEnum
CREATE TYPE "ViolationSeverity" AS ENUM ('RINGAN', 'SEDANG', 'BERAT', 'SANGAT_BERAT');

-- CreateEnum
CREATE TYPE "JenisLaporan" AS ENUM ('TEMUAN', 'APRESIASI');

-- CreateEnum
CREATE TYPE "StatusLaporan" AS ENUM ('DITERIMA', 'DIVERIFIKASI', 'DITINDAKLANJUTI', 'SELESAI', 'DITOLAK');

-- CreateEnum
CREATE TYPE "JalurLaporan" AS ENUM ('TERIDENTIFIKASI', 'TIDAK_TERDAFTAR', 'TIDAK_DIKETAHUI');

-- CreateEnum
CREATE TYPE "PeranPenerima" AS ENUM ('DOSEN', 'KEMAHASISWAAN');

-- CreateEnum
CREATE TYPE "StatusSanggahan" AS ENUM ('DIAJUKAN', 'DISETUJUI', 'DITOLAK');

-- CreateEnum
CREATE TYPE "JenisPembinaan" AS ENUM ('REFLEKSI_TERTULIS', 'KONSELING', 'TUGAS_EDUKATIF');

-- CreateEnum
CREATE TYPE "StatusPembinaan" AS ENUM ('DIMINTA', 'DIKIRIM', 'DISETUJUI', 'DITOLAK');

-- CreateTable
CREATE TABLE "Mahasiswa" (
    "ID" SERIAL NOT NULL,
    "NIM" INTEGER NOT NULL,
    "Nama_Lengkap" TEXT NOT NULL,
    "No_Handphone" VARCHAR(30),
    "Email" VARCHAR(255),
    "Password" VARCHAR(255) NOT NULL,
    "PRODI" TEXT NOT NULL,
    "Angkatan" INTEGER,
    "Nama_SMTA" VARCHAR(255),
    "DPA_ID" INTEGER,
    "Poin" INTEGER NOT NULL DEFAULT 100,
    "Timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Mahasiswa_pkey" PRIMARY KEY ("ID")
);

-- CreateTable
CREATE TABLE "Permohonan_DPA" (
    "ID" SERIAL NOT NULL,
    "Mahasiswa_ID" INTEGER NOT NULL,
    "Dosen_ID" INTEGER NOT NULL,
    "Status" "AdvisorRequestStatus" NOT NULL DEFAULT 'PENDING',
    "Pengajuan" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "Di_Setujui" TIMESTAMP(3),

    CONSTRAINT "Permohonan_DPA_pkey" PRIMARY KEY ("ID")
);

-- CreateTable
CREATE TABLE "CatatanKonseling" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "dosenId" INTEGER NOT NULL,
    "type" "CounselingRecordType" NOT NULL,
    "note" VARCHAR(2000) NOT NULL,
    "counselingDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CatatanKonseling_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerubahanPoin" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "type" "PointChangeType" NOT NULL,
    "pillar" "DisciplinePillar",
    "severity" "ViolationSeverity",
    "delta" INTEGER NOT NULL,
    "scoreAfter" INTEGER NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "recordedByIdentity" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PerubahanPoin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AturanPelanggaran" (
    "id" SERIAL NOT NULL,
    "pillar" "DisciplinePillar" NOT NULL,
    "nama" VARCHAR(200) NOT NULL,
    "severity" "ViolationSeverity" NOT NULL,
    "bobotPoin" INTEGER NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "AturanPelanggaran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Laporan" (
    "id" SERIAL NOT NULL,
    "kodeHash" CHAR(64) NOT NULL,
    "jenis" "JenisLaporan" NOT NULL,
    "pillar" "DisciplinePillar" NOT NULL,
    "aturanId" INTEGER,
    "severityUsulan" "ViolationSeverity",
    "terlaporNama" VARCHAR(200),
    "terlaporNim" VARCHAR(32),
    "terlaporKeterangan" VARCHAR(500),
    "terlaporId" INTEGER,
    "jalur" "JalurLaporan" NOT NULL DEFAULT 'TIDAK_DIKETAHUI',
    "lokasi" VARCHAR(300) NOT NULL,
    "tanggalKejadian" DATE NOT NULL,
    "deskripsi" VARCHAR(1000) NOT NULL,
    "buktiPath" VARCHAR(500),
    "tanggalLapor" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "StatusLaporan" NOT NULL DEFAULT 'DITERIMA',
    "catatanUntukPelapor" VARCHAR(1000),
    "diverifikasiOlehId" INTEGER,
    "tanggalVerifikasi" TIMESTAMP(3),
    "dikonfirmasiDosenId" INTEGER,
    "tanggalKonfirmasiDosen" TIMESTAMP(3),
    "perubahanPoinId" INTEGER,

    CONSTRAINT "Laporan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sanggahan" (
    "id" SERIAL NOT NULL,
    "perubahanPoinId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    "alasan" VARCHAR(2000) NOT NULL,
    "status" "StatusSanggahan" NOT NULL DEFAULT 'DIAJUKAN',
    "catatanPemeriksa" VARCHAR(1000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "Sanggahan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pembinaan" (
    "id" SERIAL NOT NULL,
    "perubahanPoinId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    "jenis" "JenisPembinaan" NOT NULL,
    "instruksi" VARCHAR(2000) NOT NULL,
    "status" "StatusPembinaan" NOT NULL DEFAULT 'DIMINTA',
    "isiRefleksi" VARCHAR(5000),
    "buktiUrl" VARCHAR(2000),
    "catatanPemeriksa" VARCHAR(1000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pembinaan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pemberitahuan" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "judul" VARCHAR(200) NOT NULL,
    "isi" VARCHAR(1000) NOT NULL,
    "tautanTab" VARCHAR(100),
    "dibaca" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pemberitahuan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PemberitahuanStaf" (
    "id" SERIAL NOT NULL,
    "peran" "PeranPenerima" NOT NULL,
    "dosenId" INTEGER,
    "laporanId" INTEGER,
    "judul" VARCHAR(200) NOT NULL,
    "isi" VARCHAR(1000) NOT NULL,
    "tautanTab" VARCHAR(100),
    "dibaca" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PemberitahuanStaf_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogAudit" (
    "id" SERIAL NOT NULL,
    "aktorId" INTEGER NOT NULL,
    "aktorPeran" VARCHAR(20),
    "aksi" VARCHAR(100) NOT NULL,
    "entitas" VARCHAR(100) NOT NULL,
    "entitasId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LogAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sesi" (
    "tokenHash" CHAR(64) NOT NULL,
    "profile" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sesi_pkey" PRIMARY KEY ("tokenHash")
);

-- CreateTable
CREATE TABLE "Dosen" (
    "ID" SERIAL NOT NULL,
    "Email" VARCHAR(255),
    "NUPTK" BIGINT NOT NULL,
    "Nama" TEXT NOT NULL,
    "Password" VARCHAR(255) NOT NULL,
    "Timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Dosen_pkey" PRIMARY KEY ("ID")
);

-- CreateTable
CREATE TABLE "Kemahasiswaan" (
    "ID" SERIAL NOT NULL,
    "Email" VARCHAR(255),
    "Nama" TEXT NOT NULL,
    "Password" VARCHAR(255) NOT NULL,
    "Timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Kemahasiswaan_pkey" PRIMARY KEY ("ID")
);

-- CreateTable
CREATE TABLE "Akademik" (
    "ID" SERIAL NOT NULL,
    "Email" VARCHAR(255),
    "Nama" TEXT NOT NULL,
    "Password" VARCHAR(255) NOT NULL,
    "Timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Akademik_pkey" PRIMARY KEY ("ID")
);

-- CreateTable
CREATE TABLE "PresensiAkademik" (
    "ID" SERIAL NOT NULL,
    "Mata_Kuliah" TEXT NOT NULL,
    "Kelas" TEXT NOT NULL,
    "NIM" INTEGER NOT NULL,
    "Nama_Mahasiswa" TEXT NOT NULL,
    "Jumlah_Kehadiran" INTEGER NOT NULL,
    "Timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PresensiAkademik_pkey" PRIMARY KEY ("ID")
);

-- CreateTable
CREATE TABLE "UnggahanAkademik" (
    "id" VARCHAR(64) NOT NULL,
    "category" VARCHAR(20) NOT NULL,
    "fileName" VARCHAR(255) NOT NULL,
    "storedFileName" VARCHAR(320) NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedBy" VARCHAR(255) NOT NULL,
    "rowCount" INTEGER NOT NULL,
    "summary" VARCHAR(500) NOT NULL,

    CONSTRAINT "UnggahanAkademik_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Mahasiswa_NIM_key" ON "Mahasiswa"("NIM");

-- CreateIndex
CREATE INDEX "Mahasiswa_DPA_ID_idx" ON "Mahasiswa"("DPA_ID");

-- CreateIndex
CREATE UNIQUE INDEX "Permohonan_DPA_mahasiswa_id_key" ON "Permohonan_DPA"("Mahasiswa_ID");

-- CreateIndex
CREATE INDEX "Permohonan_DPA_dosen_id_status_pengajuan_idx" ON "Permohonan_DPA"("Dosen_ID", "Status", "Pengajuan");

-- CreateIndex
CREATE INDEX "CatatanKonseling_studentId_createdAt_idx" ON "CatatanKonseling"("studentId", "createdAt");

-- CreateIndex
CREATE INDEX "CatatanKonseling_dosenId_studentId_createdAt_idx" ON "CatatanKonseling"("dosenId", "studentId", "createdAt");

-- CreateIndex
CREATE INDEX "PerubahanPoin_studentId_createdAt_idx" ON "PerubahanPoin"("studentId", "createdAt");

-- CreateIndex
CREATE INDEX "PerubahanPoin_studentId_pillar_idx" ON "PerubahanPoin"("studentId", "pillar");

-- CreateIndex
CREATE INDEX "PerubahanPoin_studentId_type_idx" ON "PerubahanPoin"("studentId", "type");

-- CreateIndex
CREATE INDEX "AturanPelanggaran_pillar_aktif_idx" ON "AturanPelanggaran"("pillar", "aktif");

-- CreateIndex
CREATE UNIQUE INDEX "AturanPelanggaran_pillar_nama_key" ON "AturanPelanggaran"("pillar", "nama");

-- CreateIndex
CREATE UNIQUE INDEX "Laporan_kodeHash_key" ON "Laporan"("kodeHash");

-- CreateIndex
CREATE UNIQUE INDEX "Laporan_perubahanPoinId_key" ON "Laporan"("perubahanPoinId");

-- CreateIndex
CREATE INDEX "Laporan_status_id_idx" ON "Laporan"("status", "id");

-- CreateIndex
CREATE INDEX "Laporan_terlaporNim_status_idx" ON "Laporan"("terlaporNim", "status");

-- CreateIndex
CREATE INDEX "Laporan_terlaporId_status_idx" ON "Laporan"("terlaporId", "status");

-- CreateIndex
CREATE INDEX "Sanggahan_studentId_createdAt_idx" ON "Sanggahan"("studentId", "createdAt");

-- CreateIndex
CREATE INDEX "Sanggahan_perubahanPoinId_status_idx" ON "Sanggahan"("perubahanPoinId", "status");

-- CreateIndex
CREATE INDEX "Pembinaan_studentId_status_createdAt_idx" ON "Pembinaan"("studentId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Pemberitahuan_studentId_dibaca_createdAt_idx" ON "Pemberitahuan"("studentId", "dibaca", "createdAt");

-- CreateIndex
CREATE INDEX "PemberitahuanStaf_peran_dosenId_dibaca_createdAt_idx" ON "PemberitahuanStaf"("peran", "dosenId", "dibaca", "createdAt");

-- CreateIndex
CREATE INDEX "LogAudit_aktorId_createdAt_idx" ON "LogAudit"("aktorId", "createdAt");

-- CreateIndex
CREATE INDEX "LogAudit_entitas_entitasId_idx" ON "LogAudit"("entitas", "entitasId");

-- CreateIndex
CREATE INDEX "Sesi_expiresAt_idx" ON "Sesi"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Dosen_NUPTK_key" ON "Dosen"("NUPTK");

-- CreateIndex
CREATE UNIQUE INDEX "Kemahasiswaan_Email_key" ON "Kemahasiswaan"("Email");

-- CreateIndex
CREATE UNIQUE INDEX "Akademik_Email_key" ON "Akademik"("Email");

-- CreateIndex
CREATE INDEX "PresensiAkademik_Mata_Kuliah_Kelas_idx" ON "PresensiAkademik"("Mata_Kuliah", "Kelas");

-- CreateIndex
CREATE UNIQUE INDEX "PresensiAkademik_Mata_Kuliah_Kelas_NIM_key" ON "PresensiAkademik"("Mata_Kuliah", "Kelas", "NIM");

-- CreateIndex
CREATE INDEX "UnggahanAkademik_category_uploadedAt_idx" ON "UnggahanAkademik"("category", "uploadedAt");

-- AddForeignKey
ALTER TABLE "Mahasiswa" ADD CONSTRAINT "Mahasiswa_DPA_ID_fkey" FOREIGN KEY ("DPA_ID") REFERENCES "Dosen"("ID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Permohonan_DPA" ADD CONSTRAINT "Permohonan_DPA_mahasiswa_id_fkey" FOREIGN KEY ("Mahasiswa_ID") REFERENCES "Mahasiswa"("ID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Permohonan_DPA" ADD CONSTRAINT "Permohonan_DPA_dosen_id_fkey" FOREIGN KEY ("Dosen_ID") REFERENCES "Dosen"("ID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatatanKonseling" ADD CONSTRAINT "CatatanKonseling_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Mahasiswa"("ID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatatanKonseling" ADD CONSTRAINT "CatatanKonseling_dosenId_fkey" FOREIGN KEY ("dosenId") REFERENCES "Dosen"("ID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerubahanPoin" ADD CONSTRAINT "PerubahanPoin_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Mahasiswa"("ID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Laporan" ADD CONSTRAINT "Laporan_terlaporId_fkey" FOREIGN KEY ("terlaporId") REFERENCES "Mahasiswa"("ID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Laporan" ADD CONSTRAINT "Laporan_aturanId_fkey" FOREIGN KEY ("aturanId") REFERENCES "AturanPelanggaran"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Laporan" ADD CONSTRAINT "Laporan_diverifikasiOlehId_fkey" FOREIGN KEY ("diverifikasiOlehId") REFERENCES "Akademik"("ID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Laporan" ADD CONSTRAINT "Laporan_dikonfirmasiDosenId_fkey" FOREIGN KEY ("dikonfirmasiDosenId") REFERENCES "Dosen"("ID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Laporan" ADD CONSTRAINT "Laporan_perubahanPoinId_fkey" FOREIGN KEY ("perubahanPoinId") REFERENCES "PerubahanPoin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sanggahan" ADD CONSTRAINT "Sanggahan_perubahanPoinId_fkey" FOREIGN KEY ("perubahanPoinId") REFERENCES "PerubahanPoin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sanggahan" ADD CONSTRAINT "Sanggahan_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Mahasiswa"("ID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pembinaan" ADD CONSTRAINT "Pembinaan_perubahanPoinId_fkey" FOREIGN KEY ("perubahanPoinId") REFERENCES "PerubahanPoin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pembinaan" ADD CONSTRAINT "Pembinaan_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Mahasiswa"("ID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pemberitahuan" ADD CONSTRAINT "Pemberitahuan_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Mahasiswa"("ID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PemberitahuanStaf" ADD CONSTRAINT "PemberitahuanStaf_dosenId_fkey" FOREIGN KEY ("dosenId") REFERENCES "Dosen"("ID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PemberitahuanStaf" ADD CONSTRAINT "PemberitahuanStaf_laporanId_fkey" FOREIGN KEY ("laporanId") REFERENCES "Laporan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresensiAkademik" ADD CONSTRAINT "PresensiAkademik_NIM_fkey" FOREIGN KEY ("NIM") REFERENCES "Mahasiswa"("NIM") ON DELETE CASCADE ON UPDATE CASCADE;

