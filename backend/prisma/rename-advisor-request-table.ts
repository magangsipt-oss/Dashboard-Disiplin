import "dotenv/config";

import { Client } from "pg";

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL belum diatur di backend/.env.");
  }

  const client = new Client({
    connectionString,
    connectionTimeoutMillis: 5000,
  });

  try {
    await client.connect();
    await client.query("BEGIN");
    try {
      const result = await client.query<{
        old_table_exists: boolean;
        new_table_exists: boolean;
      }>(`
        SELECT
          to_regclass('public."PermohonanDosenPA"') IS NOT NULL AS old_table_exists,
          to_regclass('public."Permohonan_DPA"') IS NOT NULL AS new_table_exists
      `);
      const { old_table_exists: oldTableExists, new_table_exists: newTableExists } =
        result.rows[0];

      if (oldTableExists && newTableExists) {
        throw new Error(
          'Tabel "PermohonanDosenPA" dan "Permohonan_DPA" sama-sama tersedia; periksa data sebelum melanjutkan.',
        );
      }

      if (oldTableExists) {
        await client.query(
          'ALTER TABLE public."PermohonanDosenPA" RENAME TO "Permohonan_DPA"',
        );
        console.log('Tabel "PermohonanDosenPA" berhasil diubah namanya.');
      } else if (newTableExists) {
        console.log('Tabel "Permohonan_DPA" sudah tersedia.');
      } else {
        console.log(
          'Tabel permohonan belum tersedia; Prisma akan membuat "Permohonan_DPA" saat push.',
        );
      }

      await client.query(
        'DROP VIEW IF EXISTS public."PermohonanDosenPA_Tampilan"',
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error("Perubahan tabel Permohonan DPA gagal:", error);
  process.exitCode = 1;
});
