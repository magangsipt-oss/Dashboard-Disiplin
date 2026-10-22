import {
  PeranPenerima,
  Prisma,
  type DisciplinePillar,
  type JenisLaporan,
} from "@prisma/client";

const pillarLabels: Record<DisciplinePillar, string> = {
  WAKTU: "Disiplin Waktu",
  AKADEMIK: "Disiplin Akademik",
  TATA_TERTIB: "Disiplin Tata Tertib dan Etika",
  PROSEDUR_K3: "Disiplin Prosedur dan Keselamatan (K3)",
  LINGKUNGAN: "Disiplin Lingkungan",
};

export type ReportRoute =
  | { jalur: "TIDAK_DIKETAHUI" }
  | { jalur: "TIDAK_TERDAFTAR" }
  | {
      jalur: "TERIDENTIFIKASI";
      student: { id: number; nama: string; nim: number; dosenPaId: number | null };
    };

type ResolveReportRouteInput = {
  diketahui: boolean;
  nama: string;
  nim: string;
};

export function normalizeName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isValidNimFormat(value: string): boolean {
  return /^\d{4,15}$/.test(value);
}

export function parseNim(value: string): number | null {
  if (!isValidNimFormat(value)) return null;
  const nim = Number(value);
  return nim <= 2_147_483_647 ? nim : null;
}

export async function resolveReportRoute(
  db: Prisma.TransactionClient,
  { diketahui, nama, nim }: ResolveReportRouteInput,
): Promise<ReportRoute> {
  if (!diketahui) return { jalur: "TIDAK_DIKETAHUI" };
  const parsedNim = parseNim(nim);
  if (parsedNim === null) return { jalur: "TIDAK_TERDAFTAR" };

  const student = await db.mahasiswa.findUnique({
    where: { nim: parsedNim },
    select: { id: true, nama: true, nim: true, dosenPaId: true },
  });
  if (!student || normalizeName(student.nama) !== normalizeName(nama)) {
    return { jalur: "TIDAK_TERDAFTAR" };
  }
  return { jalur: "TERIDENTIFIKASI", student };
}

type BuildReportNotificationTextsInput = {
  jenis: JenisLaporan;
  pillar: DisciplinePillar;
  tanggalKejadian: Date;
  route: ReportRoute;
  terlaporNama: string | null;
  terlaporNim: string | null;
};

type NotificationText = { judul: string; isi: string; tautanTab: string };

export type ReportNotificationTexts = {
  student: NotificationText | null;
  dosen: NotificationText | null;
  kemahasiswaan: NotificationText;
};

export function buildReportNotificationTexts({
  jenis,
  pillar,
  tanggalKejadian,
  route,
  terlaporNama,
  terlaporNim,
}: BuildReportNotificationTextsInput): ReportNotificationTexts {
  const date = tanggalKejadian.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const jenisLabel = jenis === "APRESIASI" ? "Apresiasi" : "Temuan";
  const detailKejadian = `${jenisLabel} · ${pillarLabels[pillar]} · ${date}`;
  const isApresiasi = jenis === "APRESIASI";
  let kemahasiswaanIsi: string;

  if (route.jalur === "TERIDENTIFIKASI") {
    kemahasiswaanIsi = route.student.dosenPaId === null
      ? `Terlapor sudah diberi pemberitahuan. Dosen PA belum ditetapkan. ${detailKejadian}`
      : `Terlapor sudah diberi pemberitahuan beserta Dosen PA-nya. ${detailKejadian}`;
  } else if (route.jalur === "TIDAK_TERDAFTAR") {
    kemahasiswaanIsi = `Nama/NIM yang diisi (${terlaporNama ?? ""} / ${terlaporNim ?? ""}) tidak cocok dengan data mahasiswa. Perlu ditelusuri. ${detailKejadian}`;
  } else {
    kemahasiswaanIsi = `Pelapor tidak mengetahui nama/NIM terlapor. Perlu ditelusuri. ${detailKejadian}`;
  }

  return {
    student: route.jalur === "TERIDENTIFIKASI"
      ? {
          judul: isApresiasi ? "Laporan apresiasi diterima" : "Ada laporan yang melibatkan Anda",
          isi: isApresiasi
            ? `Anda menerima laporan apresiasi. ${detailKejadian}`
            : `Ada laporan yang melibatkan Anda. Poin tidak berubah sebelum laporan diverifikasi dan dikonfirmasi. ${detailKejadian}`,
          tautanTab: isApresiasi ? "dashboard" : "tindak-lanjut",
        }
      : null,
    dosen: route.jalur === "TERIDENTIFIKASI" && route.student.dosenPaId !== null
      ? {
          judul: "Laporan terkait mahasiswa bimbingan",
          isi: `Ada ${jenisLabel.toLowerCase()} terkait mahasiswa bimbingan Anda. ${detailKejadian}`,
          tautanTab: "mahasiswa",
        }
      : null,
    kemahasiswaan: {
      judul: isApresiasi ? "Laporan apresiasi baru" : "Laporan baru perlu ditinjau",
      isi: kemahasiswaanIsi,
      tautanTab: "laporan",
    },
  };
}

type CreateReportNotificationsInput = {
  laporanId: number;
  route: ReportRoute;
  texts: ReportNotificationTexts;
};

export async function createReportNotifications(
  tx: Prisma.TransactionClient,
  { laporanId, route, texts }: CreateReportNotificationsInput,
): Promise<void> {
  await tx.pemberitahuanStaf.create({
    data: {
      peran: PeranPenerima.KEMAHASISWAAN,
      laporanId,
      judul: texts.kemahasiswaan.judul,
      isi: texts.kemahasiswaan.isi,
      tautanTab: texts.kemahasiswaan.tautanTab,
    },
  });

  if (route.jalur !== "TERIDENTIFIKASI") return;

  if (texts.student) {
    await tx.pemberitahuan.create({
      data: {
        studentId: route.student.id,
        judul: texts.student.judul,
        isi: texts.student.isi,
        tautanTab: texts.student.tautanTab,
      },
    });
  }
  if (route.student.dosenPaId !== null && texts.dosen) {
    await tx.pemberitahuanStaf.create({
      data: {
        peran: PeranPenerima.DOSEN,
        dosenId: route.student.dosenPaId,
        laporanId,
        judul: texts.dosen.judul,
        isi: texts.dosen.isi,
        tautanTab: texts.dosen.tautanTab,
      },
    });
  }
}
