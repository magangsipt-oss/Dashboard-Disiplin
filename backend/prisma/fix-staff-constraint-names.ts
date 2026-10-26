import "dotenv/config";

import { Client } from "pg";

// Tabel Akademik dan Kemahasiswaan pernah ditukar namanya, sehingga nama
// primary key dan index email ikut tertukar. `prisma db push` gagal karena
// ingin memakai nama yang sudah dipakai tabel lain. Skrip ini hanya
// mengganti nama constraint/index; data tidak disentuh. Aman diulang.
async function renameIndex(client: Client, table: string, from: string, to: string) {
  const { rowCount } = await client.query(
    `SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = $1 AND indexname = $2`,
    [table, from],
  );
  if (rowCount) {
    await client.query(`ALTER INDEX public."${from}" RENAME TO "${to}"`);
    console.log(`${table}: ${from} -> ${to}`);
  }
}

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL belum diatur di backend/.env.");
  }

  const client = new Client({ connectionString, connectionTimeoutMillis: 5000 });
  try {
    await client.connect();
    await client.query("BEGIN");
    try {
      // Pakai nama sementara agar tidak bentrok saat menukar.
      await renameIndex(client, "Akademik", "Kemahasiswaan_pkey", "tmp_Akademik_pkey");
      await renameIndex(client, "Kemahasiswaan", "Akademik_pkey", "Kemahasiswaan_pkey");
      await renameIndex(client, "Akademik", "tmp_Akademik_pkey", "Akademik_pkey");
      await renameIndex(client, "Kemahasiswaan", "Akademik_Email_key", "Kemahasiswaan_Email_key");
      await renameIndex(client, "Akademik", "Akademik_Email_Account_key", "Akademik_Email_key");
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
  console.error("Gagal memperbaiki nama constraint:", error);
  process.exitCode = 1;
});
