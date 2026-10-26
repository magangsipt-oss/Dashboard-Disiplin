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
      const result = await client.query<{ column_name: string }>(
        `SELECT column_name
         FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'Dosen'`,
      );
      const columns = new Set(result.rows.map(({ column_name }) => column_name));
      if (columns.size === 0) {
        console.log('Tabel "Dosen" belum tersedia; kolom NUPTK dan Timestamp akan dibuat oleh Prisma.');
        await client.query("COMMIT");
        return;
      }

      if (columns.has("Timestamp") && columns.has("timestamp")) {
        await client.query(
          'ALTER TABLE public."Dosen" DROP COLUMN "timestamp"',
        );
        columns.delete("timestamp");
        console.log('Kolom duplikat "Dosen"."timestamp" berhasil dihapus.');
      } else if (columns.has("timestamp")) {
        await client.query(
          'ALTER TABLE public."Dosen" RENAME COLUMN "timestamp" TO "Timestamp"',
        );
        columns.delete("timestamp");
        columns.add("Timestamp");
        console.log('Kolom "Dosen"."timestamp" berhasil dipertahankan sebagai "Timestamp".');
      }

      const oldIdentityColumns = ["NIP", "NIDN"].filter((column) =>
        columns.has(column),
      );
      if (!columns.has("NUPTK")) {
        if (oldIdentityColumns.length === 0) {
          throw new Error(
            'Kolom "Dosen"."NUPTK" tidak ditemukan dan tidak ada kolom identitas lama untuk dipertahankan.',
          );
        }
        await client.query(
          'ALTER TABLE public."Dosen" ADD COLUMN "NUPTK" BIGINT',
        );
        columns.add("NUPTK");
      }

      await client.query(
        'ALTER TABLE public."Dosen" ALTER COLUMN "NUPTK" TYPE BIGINT USING NULLIF("NUPTK"::text, \'\')::BIGINT',
      );

      if (oldIdentityColumns.length > 0) {
        const oldValues = oldIdentityColumns.map(
          (column) => `NULLIF("${column}"::text, '')::BIGINT`,
        );
        await client.query(
          `UPDATE public."Dosen"
           SET "NUPTK" = COALESCE("NUPTK", ${oldValues.join(", ")})
           WHERE "NUPTK" IS NULL`,
        );
      }

      const missing = await client.query<{ count: string }>(
        'SELECT COUNT(*)::text AS count FROM public."Dosen" WHERE "NUPTK" IS NULL',
      );
      if (Number(missing.rows[0]?.count ?? 0) > 0) {
        throw new Error(
          `${missing.rows[0].count} data dosen tidak memiliki NUPTK; kolom lama tidak dihapus.`,
        );
      }

      const duplicates = await client.query<{ nuptk: string }>(
        `SELECT "NUPTK"::text AS nuptk
         FROM public."Dosen"
         GROUP BY "NUPTK"
         HAVING COUNT(*) > 1
         LIMIT 5`,
      );
      if (duplicates.rows.length > 0) {
        throw new Error(
          `Ditemukan NUPTK duplikat (${duplicates.rows
            .map(({ nuptk }) => nuptk)
            .join(", ")}); kolom lama tidak dihapus.`,
        );
      }

      for (const column of oldIdentityColumns) {
        await client.query(
          `ALTER TABLE public."Dosen" DROP COLUMN "${column}"`,
        );
      }

      await client.query("COMMIT");
      console.log(
        `Migrasi identitas Dosen selesai; ${oldIdentityColumns.length} kolom identitas lama dihapus.`,
      );
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error("Migrasi identitas Dosen ke NUPTK gagal:", error);
  process.exitCode = 1;
});
