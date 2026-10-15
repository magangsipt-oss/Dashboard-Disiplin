import "dotenv/config";

import { Client } from "pg";

const databaseName = "dashboard_disiplin";

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL belum diatur di backend/.env.");
  }

  const targetUrl = new URL(connectionString);
  const configuredDatabase = decodeURIComponent(targetUrl.pathname.slice(1));
  if (configuredDatabase !== databaseName) {
    throw new Error(
      `DATABASE_URL harus menunjuk ke database ${databaseName}, bukan ${configuredDatabase || "(kosong)"}.`,
    );
  }

  targetUrl.pathname = "/postgres";
  const client = new Client({
    connectionString: targetUrl.toString(),
    connectionTimeoutMillis: 5000,
  });

  try {
    await client.connect();
    const result = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [
      databaseName,
    ]);

    if (result.rowCount === 0) {
      await client.query(`CREATE DATABASE "${databaseName}"`);
      console.log(`Database ${databaseName} berhasil dibuat.`);
    } else {
      console.log(`Database ${databaseName} sudah tersedia.`);
    }
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error("Pembuatan database gagal:", error);
  process.exitCode = 1;
});
