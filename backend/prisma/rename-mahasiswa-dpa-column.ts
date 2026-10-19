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
      const columns = await client.query<{ column_name: string }>(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'Mahasiswa'
      `);
      const names = new Set(columns.rows.map(({ column_name }) => column_name));

      const renames = [
        { oldName: "id", newName: "ID", required: true },
        { oldName: "timestamp", newName: "Timestamp", required: true },
        { oldName: "DosenPAId", newName: "DPA_ID", required: false },
      ] as const;
      for (const { oldName, newName, required } of renames) {
        if (names.has(oldName) && names.has(newName)) {
          throw new Error(
            `Kolom Mahasiswa."${oldName}" dan "${newName}" sama-sama tersedia.`,
          );
        }
        if (names.has(oldName)) {
          await client.query(
            `ALTER TABLE public."Mahasiswa" RENAME COLUMN "${oldName}" TO "${newName}"`,
          );
          names.delete(oldName);
          names.add(newName);
          console.log(
            `Kolom Mahasiswa."${oldName}" berhasil diubah menjadi "${newName}".`,
          );
        } else if (names.has(newName)) {
          console.log(`Kolom Mahasiswa."${newName}" sudah tersedia.`);
        } else if (required) {
          throw new Error(
            `Kolom Mahasiswa."${oldName}" maupun "${newName}" tidak ditemukan.`,
          );
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
  console.error("Perubahan nama kolom DPA mahasiswa gagal:", error);
  process.exitCode = 1;
});
