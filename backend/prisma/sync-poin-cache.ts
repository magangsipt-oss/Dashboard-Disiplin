import { PrismaClient, type Prisma } from "@prisma/client";
import { getPointSettings, scoreFromLedgerSum } from "../src/point-ledger";

// Membandingkan kolom cache Mahasiswa.Poin dengan saldo dari ledger
// PerubahanPoin. Tanpa argumen hanya melapor; dengan --terapkan cache
// disamakan dengan ledger dan setiap koreksi dicatat di LogAudit.
const database = new PrismaClient();
const apply = process.argv.includes("--terapkan");

async function syncPointCache(): Promise<void> {
  const settings = await getPointSettings(database);
  const [students, sums] = await Promise.all([
    database.mahasiswa.findMany({ select: { id: true, nim: true, nama: true, pointScore: true } }),
    database.pointChange.groupBy({ by: ["studentId"], _sum: { delta: true } }),
  ]);
  const sumByStudent = new Map(sums.map((row) => [row.studentId, row._sum.delta ?? 0]));
  const mismatches = students
    .map((student) => ({
      ...student,
      ledgerScore: scoreFromLedgerSum(sumByStudent.get(student.id) ?? 0, settings),
    }))
    .filter((student) => student.pointScore !== student.ledgerScore);

  console.info(`${students.length} mahasiswa diperiksa, ${mismatches.length} cache poin tidak sesuai ledger.`);
  for (const student of mismatches) {
    console.info(`  NIM ${student.nim} ${student.nama}: cache ${student.pointScore}, ledger ${student.ledgerScore}`);
  }
  if (!apply || mismatches.length === 0) {
    if (mismatches.length > 0) console.info("Jalankan dengan --terapkan untuk menyamakan cache dengan ledger.");
    return;
  }

  await database.$transaction(async (transaction: Prisma.TransactionClient) => {
    for (const student of mismatches) {
      await transaction.mahasiswa.update({
        where: { id: student.id },
        data: { pointScore: student.ledgerScore },
      });
      await transaction.logAudit.create({
        data: {
          aktorId: 0,
          aktorPeran: "sistem",
          aksi: "SINKRON_CACHE_POIN",
          entitas: "Mahasiswa",
          entitasId: student.id,
          nilaiLama: { poin: student.pointScore },
          nilaiBaru: { poin: student.ledgerScore },
          alasan: "Cache poin disamakan dengan ledger PerubahanPoin",
        },
      });
    }
  });
  console.info(`${mismatches.length} cache poin diperbarui.`);
}

syncPointCache()
  .catch((error: unknown) => {
    console.error("Sinkronisasi cache poin gagal:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await database.$disconnect();
  });
