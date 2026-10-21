import { PrismaClient, type DisciplinePillar, type ViolationSeverity } from "@prisma/client";

const database = new PrismaClient();

export const INITIAL_SEVERITY_POINT_WEIGHTS: Record<ViolationSeverity, number> = {
  RINGAN: 2,
  SEDANG: 5,
  BERAT: 10,
  SANGAT_BERAT: 20,
};

const initialRules: {
  pillar: DisciplinePillar;
  nama: string;
  severity: ViolationSeverity;
}[] = [
  { pillar: "WAKTU", nama: "Terlambat hadir", severity: "RINGAN" },
  { pillar: "WAKTU", nama: "Tidak hadir tanpa keterangan", severity: "SEDANG" },
  { pillar: "WAKTU", nama: "Meninggalkan kegiatan tanpa izin", severity: "SEDANG" },
  { pillar: "AKADEMIK", nama: "Tidak mengumpulkan tugas", severity: "SEDANG" },
  { pillar: "AKADEMIK", nama: "Tidak aktif dalam pembelajaran", severity: "RINGAN" },
  { pillar: "AKADEMIK", nama: "Kecurangan saat ujian", severity: "SANGAT_BERAT" },
  { pillar: "TATA_TERTIB", nama: "Pakaian tidak sesuai aturan", severity: "RINGAN" },
  { pillar: "TATA_TERTIB", nama: "Perilaku tidak sopan", severity: "SEDANG" },
  { pillar: "TATA_TERTIB", nama: "Perkelahian atau intimidasi", severity: "BERAT" },
  { pillar: "PROSEDUR_K3", nama: "Tidak menggunakan APD", severity: "BERAT" },
  { pillar: "PROSEDUR_K3", nama: "Melanggar SOP K3", severity: "SEDANG" },
  { pillar: "PROSEDUR_K3", nama: "Pelanggaran K3 serius", severity: "SANGAT_BERAT" },
  { pillar: "LINGKUNGAN", nama: "Membuang sampah sembarangan", severity: "RINGAN" },
  { pillar: "LINGKUNGAN", nama: "Tidak menjaga kebersihan area belajar", severity: "SEDANG" },
  { pillar: "LINGKUNGAN", nama: "Merusak fasilitas kampus", severity: "BERAT" },
];

async function seedRules(): Promise<void> {
  for (const rule of initialRules) {
    await database.aturanPelanggaran.upsert({
      where: { pillar_nama: { pillar: rule.pillar, nama: rule.nama } },
      update: {
        severity: rule.severity,
        bobotPoin: INITIAL_SEVERITY_POINT_WEIGHTS[rule.severity],
        aktif: true,
      },
      create: {
        ...rule,
        bobotPoin: INITIAL_SEVERITY_POINT_WEIGHTS[rule.severity],
      },
    });
  }

  console.info(`${initialRules.length} aturan disiplin berhasil disiapkan.`);
}

seedRules()
  .catch((error: unknown) => {
    console.error("Seed aturan disiplin gagal:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await database.$disconnect();
  });
