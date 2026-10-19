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
      const table = await client.query<{ exists: boolean }>(`
        SELECT to_regclass('public."Permohonan_DPA"') IS NOT NULL AS exists
      `);
      if (!table.rows[0]?.exists) {
        throw new Error('Tabel "Permohonan_DPA" tidak ditemukan.');
      }

      await client.query(`
        DROP TRIGGER IF EXISTS permohonan_dpa_sync_names
          ON public."Permohonan_DPA";
        DROP TRIGGER IF EXISTS mahasiswa_update_permohonan_dpa_name
          ON public."Mahasiswa";
        DROP TRIGGER IF EXISTS dosen_update_permohonan_dpa_name
          ON public."Dosen";
        DROP FUNCTION IF EXISTS public.sync_permohonan_dpa_names();
        DROP FUNCTION IF EXISTS public.update_permohonan_dpa_name();
        ALTER TABLE public."Permohonan_DPA"
          DROP COLUMN IF EXISTS "Mahasiswa",
          DROP COLUMN IF EXISTS "Dosen";
      `);

      const columns = await client.query<{ column_name: string }>(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'Permohonan_DPA'
      `);
      const names = new Set(columns.rows.map(({ column_name }) => column_name));
      if (names.has("Mahasiswa") || names.has("Dosen")) {
        throw new Error('Kolom teks "Mahasiswa" atau "Dosen" masih tersedia.');
      }
      for (const requiredColumn of [
        "ID",
        "Mahasiswa_ID",
        "Dosen_ID",
        "Pengajuan",
        "Di_Setujui",
      ]) {
        if (!names.has(requiredColumn)) {
          throw new Error(`Kolom "${requiredColumn}" tidak ditemukan.`);
        }
      }

      await client.query("COMMIT");
      console.log(
        'Kolom teks "Mahasiswa" dan "Dosen" berhasil dihapus; relasi ID tetap tersedia.',
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
  console.error("Penghapusan kolom nama Permohonan DPA gagal:", error);
  process.exitCode = 1;
});
