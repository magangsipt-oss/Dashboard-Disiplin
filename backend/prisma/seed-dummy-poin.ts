import { randomBytes } from "node:crypto";
import { PrismaClient, type DisciplinePillar, type ViolationSeverity } from "@prisma/client";
import { hashPassword } from "../src/password";
import {
  getActiveViolationWeights,
  recordPointChanges,
  type PointChangeInput,
} from "../src/point-ledger";

// Mahasiswa dummy untuk menguji menu poin di database bersama. Semua data
// ditandai NIM 9999xxxx dan nama berawalan "[DUMMY]", tidak bisa login, dan
// tidak punya DPA atau laporan sehingga tidak masuk antrean tim lain.
//   npm run prisma:seed:dummy-poin            -> tambah (yang sudah ada dilewati)
//   npm run prisma:seed:dummy-poin -- --hapus -> hapus semua dummy beserta ledgernya
const database = new PrismaClient();
const NIM_MIN = 99_990_000;
const NIM_MAX = 99_999_999;
const NAME_PREFIX = "[DUMMY]";
const RECORDED_BY = "SEED-DUMMY";
const dummyWhere = { nim: { gte: NIM_MIN, lte: NIM_MAX }, nama: { startsWith: NAME_PREFIX } };

type Violation = [DisciplinePillar, ViolationSeverity, number];
type DummyStudent = {
  nama: string;
  angkatan: number;
  // [kategori, tingkat, berapa bulan lalu]
  violations: Violation[];
  // Poin lomba/kegiatan yang disetujui, [poin, berapa bulan lalu]
  activities?: [number, number][];
};

const dummyStudents: DummyStudent[] = [
  { nama: "Andi Pratama", angkatan: 2023, violations: [] },
  { nama: "Bunga Lestari", angkatan: 2024, violations: [["WAKTU", "RINGAN", 2]] },
  { nama: "Citra Maharani", angkatan: 2025, violations: [["LINGKUNGAN", "SEDANG", 4], ["WAKTU", "RINGAN", 1]] },
  { nama: "Dimas Saputra", angkatan: 2023, violations: [["AKADEMIK", "SEDANG", 5], ["TATA_TERTIB", "RINGAN", 3]] },
  { nama: "Eka Wulandari", angkatan: 2024, violations: [["PROSEDUR_K3", "SEDANG", 3], ["WAKTU", "SEDANG", 1]] },
  { nama: "Fajar Nugroho", angkatan: 2025, violations: [["AKADEMIK", "BERAT", 4], ["LINGKUNGAN", "RINGAN", 2]] },
  { nama: "Gita Permata", angkatan: 2023, violations: [["PROSEDUR_K3", "BERAT", 5], ["TATA_TERTIB", "SEDANG", 2]] },
  {
    nama: "Hendra Wijaya",
    angkatan: 2024,
    violations: [["AKADEMIK", "BERAT", 6], ["PROSEDUR_K3", "SEDANG", 4], ["WAKTU", "BERAT", 2], ["TATA_TERTIB", "SEDANG", 1]],
  },
  { nama: "Intan Safitri", angkatan: 2025, violations: [["WAKTU", "RINGAN", 3]], activities: [[15, 2], [10, 1]] },
  { nama: "Joko Santoso", angkatan: 2023, violations: [["TATA_TERTIB", "BERAT", 2], ["WAKTU", "SEDANG", 1]], activities: [[5, 3]] },
  { nama: "Kartika Dewi", angkatan: 2024, violations: [["LINGKUNGAN", "BERAT", 5], ["LINGKUNGAN", "SEDANG", 3], ["WAKTU", "RINGAN", 1]] },
  { nama: "Lukman Hakim", angkatan: 2025, violations: [["AKADEMIK", "RINGAN", 1]] },
];

const pillarNames: Record<DisciplinePillar, string> = {
  WAKTU: "Disiplin Waktu",
  AKADEMIK: "Disiplin Akademik",
  TATA_TERTIB: "Disiplin Tata Tertib dan Etika",
  PROSEDUR_K3: "Disiplin Prosedur dan Keselamatan (K3)",
  LINGKUNGAN: "Disiplin Lingkungan",
};

function monthsAgo(months: number, dayOffset: number): Date {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  date.setDate(Math.max(1, date.getDate() - dayOffset));
  return date;
}

async function removeDummies(): Promise<void> {
  // PerubahanPoin, Pemberitahuan, dll. ikut terhapus (onDelete: Cascade).
  const { count } = await database.mahasiswa.deleteMany({ where: dummyWhere });
  console.info(`${count} mahasiswa dummy dihapus.`);
}

async function seedDummies(): Promise<void> {
  const prodiRows = await database.mahasiswa.findMany({
    where: { NOT: dummyWhere },
    distinct: ["jurusan"],
    select: { jurusan: true },
    take: 5,
  });
  const prodiList = prodiRows.length > 0 ? prodiRows.map((row) => row.jurusan) : ["Prodi Uji Coba"];
  const weights = await getActiveViolationWeights(database);

  let created = 0;
  for (const [index, dummy] of dummyStudents.entries()) {
    const nim = NIM_MIN + index + 1;
    const existing = await database.mahasiswa.findUnique({ where: { nim }, select: { nama: true } });
    if (existing) {
      if (!existing.nama.startsWith(NAME_PREFIX)) {
        throw new Error(`NIM ${nim} sudah dipakai mahasiswa asli; seed dihentikan.`);
      }
      continue;
    }

    await database.$transaction(async (transaction) => {
      const student = await transaction.mahasiswa.create({
        data: {
          nim,
          nama: `${NAME_PREFIX} ${dummy.nama}`,
          password: await hashPassword(randomBytes(24).toString("base64url")),
          jurusan: prodiList[index % prodiList.length],
          angkatan: dummy.angkatan,
        },
        select: { id: true },
      });

      const changes: PointChangeInput[] = [
        ...dummy.violations.flatMap(([pillar, severity, months], order): PointChangeInput[] => {
          const weight = weights.get(`${pillar}:${severity}`);
          if (weight === undefined) return [];
          return [{
            studentId: student.id,
            type: "DISCIPLINE_VIOLATION",
            pillar,
            severity,
            delta: weight,
            bobotSnapshot: weight,
            reason: `[DUMMY] Pelanggaran ${pillarNames[pillar]} tingkat ${severity.toLowerCase()}`,
            recordedByIdentity: RECORDED_BY,
            createdAt: monthsAgo(months, order),
          }];
        }),
        ...(dummy.activities ?? []).map(([points, months], order): PointChangeInput => ({
          studentId: student.id,
          type: "COMPETITION",
          delta: points,
          reason: "[DUMMY] Lomba tingkat kampus",
          recordedByIdentity: RECORDED_BY,
          createdAt: monthsAgo(months, order + 10),
        })),
      ].sort((a, b) => a.createdAt!.getTime() - b.createdAt!.getTime());

      await recordPointChanges(transaction, changes);
    });
    created += 1;
  }
  console.info(`${created} mahasiswa dummy ditambahkan (${dummyStudents.length - created} sudah ada).`);
}

(process.argv.includes("--hapus") ? removeDummies() : seedDummies())
  .catch((error: unknown) => {
    console.error("Seed mahasiswa dummy gagal:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await database.$disconnect();
  });
