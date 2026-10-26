import { PrismaClient, type DisciplinePillar, type ViolationSeverity } from "@prisma/client";

const database = new PrismaClient();

export interface AturanDisiplinItem {
  pillar: DisciplinePillar;
  nama: string;
  severity: ViolationSeverity;
  bobotPoin: number;
}

export const ATURAN_PENGURANGAN_POIN: AturanDisiplinItem[] = [
  // 01. Disiplin Waktu
  { pillar: "WAKTU", nama: "Terlambat hadir", severity: "RINGAN", bobotPoin: 5 },
  { pillar: "WAKTU", nama: "Tidak tertib waktu", severity: "RINGAN", bobotPoin: 5 },
  { pillar: "WAKTU", nama: "Tidak hadir tanpa izin", severity: "SEDANG", bobotPoin: 10 },
  { pillar: "WAKTU", nama: "Izin tidak sesuai prosedur", severity: "SEDANG", bobotPoin: 10 },
  { pillar: "WAKTU", nama: "Meninggalkan kegiatan tanpa izin", severity: "BERAT", bobotPoin: 15 },
  { pillar: "WAKTU", nama: "Alpa berulang", severity: "BERAT", bobotPoin: 15 },

  // 02. Disiplin Akademik
  { pillar: "AKADEMIK", nama: "Tugas tidak dikumpulkan", severity: "RINGAN", bobotPoin: 10 },
  { pillar: "AKADEMIK", nama: "Tidak mengikuti kewajiban akademik", severity: "RINGAN", bobotPoin: 10 },
  { pillar: "AKADEMIK", nama: "Ketidakjujuran tugas atau laporan", severity: "SEDANG", bobotPoin: 15 },
  { pillar: "AKADEMIK", nama: "Pelanggaran tata tertib ujian", severity: "SEDANG", bobotPoin: 15 },
  { pillar: "AKADEMIK", nama: "Plagiarisme", severity: "BERAT", bobotPoin: 25 },
  { pillar: "AKADEMIK", nama: "Kecurangan akademik", severity: "BERAT", bobotPoin: 25 },

  // 03. Disiplin Tata Tertib dan Etika
  { pillar: "TATA_TERTIB", nama: "Penampilan tidak sesuai ketentuan", severity: "RINGAN", bobotPoin: 5 },
  { pillar: "TATA_TERTIB", nama: "Komunikasi tidak santun", severity: "SEDANG", bobotPoin: 10 },
  { pillar: "TATA_TERTIB", nama: "Etika digital tidak tepat", severity: "SEDANG", bobotPoin: 10 },
  { pillar: "TATA_TERTIB", nama: "Perilaku tidak sopan", severity: "BERAT", bobotPoin: 15 },
  { pillar: "TATA_TERTIB", nama: "Mengganggu ketertiban kampus", severity: "BERAT", bobotPoin: 15 },

  // 04. Disiplin Prosedur dan Keselamatan (K3)
  { pillar: "PROSEDUR_K3", nama: "Tidak lengkap APD", severity: "RINGAN", bobotPoin: 10 },
  { pillar: "PROSEDUR_K3", nama: "Tidak tertib prosedur keselamatan", severity: "RINGAN", bobotPoin: 10 },
  { pillar: "PROSEDUR_K3", nama: "Tidak mematuhi SOP praktikum/lab", severity: "SEDANG", bobotPoin: 20 },
  { pillar: "PROSEDUR_K3", nama: "Tindakan berbahaya yang membahayakan diri atau orang lain", severity: "BERAT", bobotPoin: 30 },

  // 05. Disiplin Lingkungan
  { pillar: "LINGKUNGAN", nama: "Membuang sampah tidak pada tempatnya", severity: "RINGAN", bobotPoin: 5 },
  { pillar: "LINGKUNGAN", nama: "Tidak menjaga fasilitas kampus", severity: "SEDANG", bobotPoin: 10 },
  { pillar: "LINGKUNGAN", nama: "Tidak melaporkan kerusakan fasilitas", severity: "SEDANG", bobotPoin: 10 },
  { pillar: "LINGKUNGAN", nama: "Merusak fasilitas kampus", severity: "BERAT", bobotPoin: 15 },
  { pillar: "LINGKUNGAN", nama: "Pemborosan energi berulang", severity: "BERAT", bobotPoin: 15 },
];

async function seedRules(): Promise<void> {
  // Pastikan tabel laporan & perubahan poin kosong sesuai permintaan user
  await database.laporan.deleteMany({});
  await database.pointChange.deleteMany({});
  console.info("Tabel Laporan dan PerubahanPoin dipastikan kosong.");

  // Hapus aturan lama jika ada agar sinkron bersih
  await database.aturanPelanggaran.deleteMany({});

  for (const rule of ATURAN_PENGURANGAN_POIN) {
    await database.aturanPelanggaran.create({
      data: {
        pillar: rule.pillar,
        nama: rule.nama,
        severity: rule.severity,
        bobotPoin: rule.bobotPoin,
        aktif: true,
      },
    });
  }

  const count = await database.aturanPelanggaran.count();
  console.info(`Berhasil memasukkan ${count} aturan pengurangan poin ke database PostgreSQL.`);
}

seedRules()
  .catch((error: unknown) => {
    console.error("Seed aturan pengurangan poin gagal:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await database.$disconnect();
  });
