import "dotenv/config";

import { Client } from "pg";

type ColumnRename = {
  oldName: string;
  newName: string;
};

async function renameColumns(
  client: Client,
  tableName: string,
  renames: ColumnRename[],
): Promise<void> {
  const result = await client.query<{ column_name: string }>(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1`,
    [tableName],
  );
  const columns = new Set(result.rows.map(({ column_name }) => column_name));
  if (columns.size === 0) {
    throw new Error(`Tabel "${tableName}" tidak ditemukan.`);
  }

  for (const { oldName, newName } of renames) {
    if (columns.has(oldName) && columns.has(newName)) {
      throw new Error(
        `Kolom "${tableName}"."${oldName}" dan "${newName}" sama-sama tersedia.`,
      );
    }
    if (columns.has(oldName)) {
      await client.query(
        `ALTER TABLE public."${tableName}" RENAME COLUMN "${oldName}" TO "${newName}"`,
      );
      columns.delete(oldName);
      columns.add(newName);
      console.log(
        `Kolom "${tableName}"."${oldName}" berhasil diubah menjadi "${newName}".`,
      );
    } else if (columns.has(newName)) {
      console.log(`Kolom "${tableName}"."${newName}" sudah tersedia.`);
    } else {
      throw new Error(
        `Kolom "${tableName}"."${oldName}" maupun "${newName}" tidak ditemukan.`,
      );
    }
  }
}

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
      await renameColumns(client, "Dosen", [{ oldName: "id", newName: "ID" }]);
      await renameColumns(client, "Kemahasiswaan", [
        { oldName: "id", newName: "ID" },
        { oldName: "timestamp", newName: "Timestamp" },
      ]);
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
  console.error("Perubahan nama kolom identitas dosen/admin gagal:", error);
  process.exitCode = 1;
});
