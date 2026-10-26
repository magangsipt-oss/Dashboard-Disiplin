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

    await client.query("BEGIN");
    await client.query(`
      ALTER TABLE "Laporan"
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
