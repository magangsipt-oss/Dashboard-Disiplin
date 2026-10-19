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
        console.log('Tabel "Permohonan_DPA" belum tersedia; tidak ada kolom untuk diubah.');
        await client.query("COMMIT");
        return;
      }

      const columns = await client.query<{ column_name: string }>(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'Permohonan_DPA'
      `);
      const names = new Set(columns.rows.map(({ column_name }) => column_name));
      const renames = [
        { oldNames: ["id"], newName: "ID", optional: false },
        { oldNames: ["studentId", "mahasiswa_id"], newName: "Mahasiswa_ID", optional: false },
        { oldNames: ["dosenId", "dosen_id"], newName: "Dosen_ID", optional: false },
        { oldNames: ["status"], newName: "Status", optional: false },
        { oldNames: ["createdAt", "pengajuan"], newName: "Pengajuan", optional: false },
        { oldNames: ["reviewedAt", "di_setujui"], newName: "Di_Setujui", optional: true },
      ] as const;

      for (const { oldNames, newName, optional } of renames) {
        const oldName = oldNames.find((candidate) => names.has(candidate));
        if (names.has(newName) && oldName) {
          throw new Error(
            `Kolom "${oldName}" dan "${newName}" sama-sama tersedia; periksa data sebelum melanjutkan.`,
          );
        }
        if (oldName) {
          await client.query(
            `ALTER TABLE public."Permohonan_DPA" RENAME COLUMN "${oldName}" TO "${newName}"`,
          );
          names.delete(oldName);
          names.add(newName);
          console.log(`Kolom "${oldName}" berhasil diubah menjadi "${newName}".`);
        } else if (names.has(newName)) {
          console.log(`Kolom "${newName}" sudah tersedia.`);
        } else {
          if (optional) {
            console.log(`Kolom opsional "${newName}" belum tersedia.`);
            continue;
          }
          throw new Error(
            `Kolom "${oldNames.join('" atau "')}" maupun "${newName}" tidak ditemukan di tabel Permohonan_DPA.`,
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
  console.error("Perubahan nama kolom Permohonan DPA gagal:", error);
  process.exitCode = 1;
});
