import { resolve } from "node:path";
import dotenv from "dotenv";
import { Client } from "pg";

dotenv.config({ path: resolve(__dirname, "../.env") });

async function migrateReportWorkflow(): Promise<void> {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(`ALTER TYPE "StatusLaporan" ADD VALUE IF NOT EXISTS 'SELESAI'`);
    await client.query(`ALTER TYPE "JenisPembinaan" ADD VALUE IF NOT EXISTS 'TUGAS_EDUKATIF'`);
    await client.query(`
      DO $migration$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'JalurLaporan') THEN
          CREATE TYPE "JalurLaporan" AS ENUM (
            'TERIDENTIFIKASI',
            'TIDAK_TERDAFTAR',
            'TIDAK_DIKETAHUI'
          );
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PeranPenerima') THEN
          CREATE TYPE "PeranPenerima" AS ENUM ('DOSEN', 'KEMAHASISWAAN');
        END IF;
      END
      $migration$
    `);

    await client.query("BEGIN");
    await client.query(`
      ALTER TABLE "Laporan"
        ADD COLUMN IF NOT EXISTS "terlaporNama" VARCHAR(200),
        ADD COLUMN IF NOT EXISTS "terlaporId" INTEGER,
        ADD COLUMN IF NOT EXISTS "jalur" "JalurLaporan" NOT NULL DEFAULT 'TIDAK_DIKETAHUI',
        ADD COLUMN IF NOT EXISTS "dikonfirmasiDosenId" INTEGER,
        ADD COLUMN IF NOT EXISTS "tanggalKonfirmasiDosen" TIMESTAMP(3)
    `);
    await client.query(`
      ALTER TABLE "Pembinaan"
        ADD COLUMN IF NOT EXISTS "buktiUrl" VARCHAR(2000)
    `);
    await client.query(`
      DO $migration$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'Laporan_dikonfirmasiDosenId_fkey'
            AND conrelid = '"Laporan"'::regclass
        ) THEN
          ALTER TABLE "Laporan"
            ADD CONSTRAINT "Laporan_dikonfirmasiDosenId_fkey"
            FOREIGN KEY ("dikonfirmasiDosenId")
            REFERENCES "Dosen"("ID")
            ON DELETE SET NULL
            ON UPDATE CASCADE;
        END IF;
      END
      $migration$
    `);
    await client.query(`
      DO $migration$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'Laporan_terlaporId_fkey'
            AND conrelid = '"Laporan"'::regclass
        ) THEN
          ALTER TABLE "Laporan"
            ADD CONSTRAINT "Laporan_terlaporId_fkey"
            FOREIGN KEY ("terlaporId")
            REFERENCES "Mahasiswa"("ID")
            ON DELETE SET NULL
            ON UPDATE CASCADE;
        END IF;
      END
      $migration$
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS "PemberitahuanStaf" (
        "id" SERIAL NOT NULL,
        "peran" "PeranPenerima" NOT NULL,
        "dosenId" INTEGER,
        "laporanId" INTEGER,
        "judul" VARCHAR(200) NOT NULL,
        "isi" VARCHAR(1000) NOT NULL,
        "tautanTab" VARCHAR(100),
        "dibaca" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PemberitahuanStaf_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "PemberitahuanStaf_dosenId_fkey"
          FOREIGN KEY ("dosenId") REFERENCES "Dosen"("ID")
          ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "PemberitahuanStaf_laporanId_fkey"
          FOREIGN KEY ("laporanId") REFERENCES "Laporan"("id")
          ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS "Laporan_terlaporId_status_idx"
      ON "Laporan"("terlaporId", "status")
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS "PemberitahuanStaf_peran_dosenId_dibaca_createdAt_idx"
      ON "PemberitahuanStaf"("peran", "dosenId", "dibaca", "createdAt")
    `);
    await client.query("COMMIT");
    console.log("Report workflow database changes applied.");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

migrateReportWorkflow().catch((error: unknown) => {
  console.error("Report workflow database migration failed:", error);
  process.exitCode = 1;
});
