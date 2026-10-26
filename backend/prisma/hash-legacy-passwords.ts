import "dotenv/config";

import { Client } from "pg";
import { hashPassword, isHashedPassword } from "../src/password";

// Meng-hash semua password teks polos yang tersisa. Aman dijalankan berulang.
const tables = ["Mahasiswa", "Dosen", "Kemahasiswaan", "Akademik"] as const;

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
      for (const table of tables) {
        const { rows } = await client.query<{ id: number; password: string }>(
          `SELECT "ID" AS id, "Password" AS password FROM public."${table}"
           WHERE "Password" NOT LIKE 'scrypt$%'`,
        );
        for (const row of rows) {
          if (isHashedPassword(row.password)) continue;
          await client.query(
            `UPDATE public."${table}" SET "Password" = $1 WHERE "ID" = $2`,
            [await hashPassword(row.password), row.id],
          );
        }
        console.log(`${table}: ${rows.length} password di-hash.`);
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
  console.error("Gagal meng-hash password lama:", error);
  process.exitCode = 1;
});
