import "dotenv/config";

import { PrismaClient } from "@prisma/client";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const prisma = new PrismaClient();
const dataPath = resolve(process.cwd(), "prisma", "database-data.json");

type Snapshot = {
  formatVersion: 2;
  exportedAt: string;
  mahasiswa: {
    id: number;
    nim: number;
    nama: string;
    password: string;
    jurusan: string;
    timestamp: string;
  }[];
  dosen: {
    id: number;
    nidn: string;
    nip: string;
    nama: string;
    password: string;
    timestamp: string;
  }[];
  kemahasiswaan: {
    id: number;
    nip: string;
    nama: string;
    password: string;
    timestamp: string;
  }[];
};

type UnknownRecord = Record<string, unknown>;

function requireRecord(value: unknown, label: string): UnknownRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} harus berupa objek.`);
  }
  return value as UnknownRecord;
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== "string") {
    throw new Error(`${label} harus berupa teks.`);
  }
  return value;
}

function requireInteger(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    throw new Error(`${label} harus berupa bilangan bulat yang valid.`);
  }
  return value;
}

function requireBigIntString(value: unknown, label: string): string {
  const result = requireString(value, label);
  if (!/^-?\d+$/.test(result)) {
    throw new Error(`${label} harus berupa teks angka untuk nilai bigint.`);
  }
  return result;
}

function requireDateString(value: unknown, label: string): string {
  const result = requireString(value, label);
  if (Number.isNaN(new Date(result).getTime())) {
    throw new Error(`${label} harus berupa tanggal yang valid.`);
  }
  return result;
}

function requireRows(value: unknown, label: string): UnknownRecord[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label} harus berupa array.`);
  }
  return value.map((row, index) => requireRecord(row, `${label}[${index}]`));
}

function parseSnapshot(value: unknown): Snapshot {
  const data = requireRecord(value, "File ekspor");
  if (data.formatVersion !== 2) {
    throw new Error("Versi format file ekspor tidak didukung. Ekspor ulang data sumber.");
  }

  const mahasiswa = requireRows(data.mahasiswa, "mahasiswa").map((row, index) => {
    const label = `mahasiswa[${index}]`;
    return {
      id: requireInteger(row.id, `${label}.id`),
      nim: requireInteger(row.nim, `${label}.nim`),
      nama: requireString(row.nama, `${label}.nama`),
      password: requireString(row.password, `${label}.password`),
      jurusan: requireString(row.jurusan, `${label}.jurusan`),
      timestamp: requireDateString(row.timestamp, `${label}.timestamp`),
    };
  });

  const dosen = requireRows(data.dosen, "dosen").map((row, index) => {
    const label = `dosen[${index}]`;
    return {
      id: requireInteger(row.id, `${label}.id`),
      nidn: requireBigIntString(row.nidn, `${label}.nidn`),
      nip: requireBigIntString(row.nip, `${label}.nip`),
      nama: requireString(row.nama, `${label}.nama`),
      password: requireString(row.password, `${label}.password`),
      timestamp: requireDateString(row.timestamp, `${label}.timestamp`),
    };
  });

  const kemahasiswaan = requireRows(data.kemahasiswaan, "kemahasiswaan").map((row, index) => {
    const label = `kemahasiswaan[${index}]`;
    return {
      id: requireInteger(row.id, `${label}.id`),
      nip: requireBigIntString(row.nip, `${label}.nip`),
      nama: requireString(row.nama, `${label}.nama`),
      password: requireString(row.password, `${label}.password`),
      timestamp: requireDateString(row.timestamp, `${label}.timestamp`),
    };
  });

  return {
    formatVersion: 2,
    exportedAt: requireDateString(data.exportedAt, "exportedAt"),
    mahasiswa,
    dosen,
    kemahasiswaan,
  };
}

async function exportData(): Promise<void> {
  const [mahasiswa, dosen, kemahasiswaan] = await Promise.all([
    prisma.mahasiswa.findMany(),
    prisma.dosen.findMany(),
    prisma.kemahasiswaan.findMany(),
  ]);

  const snapshot: Snapshot = {
    formatVersion: 2,
    exportedAt: new Date().toISOString(),
    mahasiswa: mahasiswa.map((row) => ({
      ...row,
      timestamp: row.timestamp.toISOString(),
    })),
    dosen: dosen.map((row) => ({
      ...row,
      nidn: row.nidn.toString(),
      nip: row.nip.toString(),
      timestamp: row.timestamp.toISOString(),
    })),
    kemahasiswaan: kemahasiswaan.map((row) => ({
      ...row,
      nip: row.nip.toString(),
      timestamp: row.timestamp.toISOString(),
    })),
  };

  await writeFile(dataPath, `${JSON.stringify(snapshot, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  console.log(
    `Ekspor selesai dari dashboard_disiplin: ${mahasiswa.length} mahasiswa, ${dosen.length} dosen, ${kemahasiswaan.length} kemahasiswaan.`,
  );
  console.warn("File ini berisi data pribadi dan password. Jangan commit atau bagikan melalui kanal publik.");
}

async function importData(): Promise<void> {
  const contents = await readFile(dataPath, "utf8");
  const snapshot = parseSnapshot(JSON.parse(contents) as unknown);

  const [mahasiswa, dosen, kemahasiswaan] = await Promise.all([
    prisma.mahasiswa.createMany({
      data: snapshot.mahasiswa.map((row) => ({
        ...row,
        timestamp: new Date(row.timestamp),
      })),
      skipDuplicates: true,
    }),
    prisma.dosen.createMany({
      data: snapshot.dosen.map((row) => ({
        ...row,
        nidn: BigInt(row.nidn),
        nip: BigInt(row.nip),
        timestamp: new Date(row.timestamp),
      })),
      skipDuplicates: true,
    }),
    prisma.kemahasiswaan.createMany({
      data: snapshot.kemahasiswaan.map((row) => ({
        ...row,
        nip: BigInt(row.nip),
        timestamp: new Date(row.timestamp),
      })),
      skipDuplicates: true,
    }),
  ]);

  await Promise.all([
    prisma.$queryRaw`SELECT setval(pg_get_serial_sequence('"public"."Mahasiswa"', 'id'), COALESCE((SELECT MAX(id) FROM public."Mahasiswa"), 1), EXISTS (SELECT 1 FROM public."Mahasiswa"))`,
    prisma.$queryRaw`SELECT setval(pg_get_serial_sequence('"public"."Dosen"', 'id'), COALESCE((SELECT MAX(id) FROM public."Dosen"), 1), EXISTS (SELECT 1 FROM public."Dosen"))`,
    prisma.$queryRaw`SELECT setval(pg_get_serial_sequence('"public"."Kemahasiswaan"', 'id'), COALESCE((SELECT MAX(id) FROM public."Kemahasiswaan"), 1), EXISTS (SELECT 1 FROM public."Kemahasiswaan"))`,
  ]);

  console.log(
    `Impor selesai. Baris baru: ${mahasiswa.count} mahasiswa, ${dosen.count} dosen, ${kemahasiswaan.count} kemahasiswaan. Baris duplikat dilewati.`,
  );
}

async function main(): Promise<void> {
  const action = process.argv[2];
  if (action === "export") {
    await exportData();
  } else if (action === "import") {
    await importData();
  } else {
    throw new Error("Gunakan perintah 'export' atau 'import'.");
  }
}

main()
  .catch((error: unknown) => {
    console.error("Transfer data gagal:", error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
