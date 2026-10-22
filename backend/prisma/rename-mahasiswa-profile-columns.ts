import "dotenv/config";

import { Client } from "pg";

const columnRenames = [
  { oldName: "Nama", newName: "Nama_Lengkap" },
  { oldName: "Jurusan", newName: "PRODI" },
] as const;

const addedColumns = [
  { name: "No_Handphone", definition: 'VARCHAR(30)' },
  { name: "Email", definition: 'VARCHAR(255)' },
  { name: "Angkatan", definition: "INTEGER" },
  { name: "Nama_SMTA", definition: 'VARCHAR(255)' },
] as const;

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
      const result = await client.query<{ column_name: string }>(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'Mahasiswa'
      `);
      const columns = new Set(result.rows.map(({ column_name }) => column_name));

      for (const { oldName, newName } of columnRenames) {
        if (columns.has(oldName) && columns.has(newName)) {
          throw new Error(
            `Kolom Mahasiswa."${oldName}" dan "${newName}" sama-sama tersedia; hentikan migrasi untuk menghindari kehilangan data.`,
          );
        }
        if (columns.has(oldName)) {
          await client.query(
            `ALTER TABLE public."Mahasiswa" RENAME COLUMN "${oldName}" TO "${newName}"`,
          );
          columns.delete(oldName);
          columns.add(newName);
          console.log(`Kolom "${oldName}" diubah namanya menjadi "${newName}".`);
        } else if (!columns.has(newName)) {
          throw new Error(
            `Kolom Mahasiswa."${oldName}" maupun "${newName}" tidak ditemukan.`,
          );
        }
      }

      for (const { name, definition } of addedColumns) {
        if (!columns.has(name)) {
          await client.query(
            `ALTER TABLE public."Mahasiswa" ADD COLUMN "${name}" ${definition}`,
          );
          columns.add(name);
          console.log(`Kolom "${name}" berhasil ditambahkan.`);
        }
      }

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
  console.error("Perubahan struktur tabel Mahasiswa gagal:", error);
  process.exitCode = 1;
});
