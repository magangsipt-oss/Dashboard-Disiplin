import {
  PeranPenerima,
  Prisma,
  type DisciplinePillar,
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

type ReportedStudent = { id: number; nama: string; nim: number; dosenPaId: number | null };

function nameTokens(value: string): string[] {
  return normalizeName(value).split(" ").filter(Boolean);
}

// Mahasiswa yang namanya memuat semua kata yang diisi pelapor (kata utuh, bukan potongan).
async function findStudentsByName(
  db: Prisma.TransactionClient,
  nama: string,
): Promise<ReportedStudent[]> {
  const tokens = nameTokens(nama);
  if (tokens.length === 0) return [];
  const candidates = await db.mahasiswa.findMany({
    where: { AND: tokens.map((token) => ({ nama: { contains: token, mode: "insensitive" } })) },
    select: { id: true, nama: true, nim: true, dosenPaId: true },
  });
  const matches = candidates.filter((student) => {
    const studentTokens = new Set(nameTokens(student.nama));
    return tokens.every((token) => studentTokens.has(token));
  });
  // Nama lengkap yang persis sama lebih diutamakan daripada kecocokan sebagian.
  const exact = matches.filter((student) => normalizeName(student.nama) === tokens.join(" "));
  return exact.length === 1 ? exact : matches;
}

// Pencocokan laporan dari pelapor: nama wajib, NIM opsional.
// Teridentifikasi jika nama atau NIM menunjuk tepat satu mahasiswa.
export async function matchReportedStudent(
  db: Prisma.TransactionClient,
  { diketahui, nama, nim }: ResolveReportRouteInput,
): Promise<ReportRoute> {
  if (!diketahui) return { jalur: "TIDAK_DIKETAHUI" };
  const parsedNim = nim ? parseNim(nim) : null;
  const nimStudent = parsedNim === null
    ? null
    : await db.mahasiswa.findUnique({
        where: { nim: parsedNim },
        select: { id: true, nama: true, nim: true, dosenPaId: true },
      });
  const nameStudents = await findStudentsByName(db, nama);

  if (nimStudent) {
    // NIM cocok, tetapi nama menunjuk mahasiswa lain: data bertentangan.
    const conflict =
      nameStudents.length > 0 && !nameStudents.some((student) => student.id === nimStudent.id);
    return conflict
      ? { jalur: "TIDAK_TERDAFTAR" }
      : { jalur: "TERIDENTIFIKASI", student: nimStudent };
  }
  return nameStudents.length === 1
    ? { jalur: "TERIDENTIFIKASI", student: nameStudents[0] }
    : { jalur: "TIDAK_TERDAFTAR" };
}

type BuildReportNotificationTextsInput = {
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
  kemahasiswaan: NotificationText | null;
};

export function buildReportNotificationTexts({
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
  const detailKejadian = `Pelanggaran · ${pillarLabels[pillar]} · ${date}`;
  let kemahasiswaanIsi: string;

  if (route.jalur === "TERIDENTIFIKASI") {
    kemahasiswaanIsi = route.student.dosenPaId === null
      ? `Terlapor sudah menerima notifikasi, tetapi Dosen PA belum ditetapkan. ${detailKejadian}`
      : `Laporan diteruskan kepada terlapor dan Dosen PA untuk konfirmasi. ${detailKejadian}`;
  } else if (route.jalur === "TIDAK_TERDAFTAR") {
    kemahasiswaanIsi = `Nama/NIM yang diisi (${terlaporNama || "-"} / ${terlaporNim || "-"}) tidak cocok atau cocok dengan lebih dari satu mahasiswa. Perlu ditelusuri. ${detailKejadian}`;
  } else {
    kemahasiswaanIsi = `Pelapor tidak mengetahui nama/NIM terlapor. Perlu ditelusuri. ${detailKejadian}`;
  }

  return {
    student: route.jalur === "TERIDENTIFIKASI"
      ? {
          judul: "Ada laporan yang melibatkan Anda",
          isi: `Ada laporan yang melibatkan Anda. Dosen PA akan meninjau laporan; poin belum berubah sebelum konfirmasi. ${detailKejadian}`,
          tautanTab: "tindak-lanjut",
        }
      : null,
    dosen: route.jalur === "TERIDENTIFIKASI" && route.student.dosenPaId !== null
      ? {
          judul: "Laporan terkait mahasiswa bimbingan",
          isi: `Ada laporan pelanggaran terkait mahasiswa bimbingan Anda. ${detailKejadian}`,
          tautanTab: "laporan",
        }
      : null,
    kemahasiswaan: {
      judul: "Laporan baru perlu ditinjau",
      isi: kemahasiswaanIsi,
      tautanTab: "laporan",
    },
  };
}

type CreateReportNotificationsInput = {
  laporanId: number;
  route: ReportRoute;
  texts: ReportNotificationTexts;
  notifyKemahasiswaan?: boolean;
};

export async function createReportNotifications(
  tx: Prisma.TransactionClient,
  { laporanId, route, texts, notifyKemahasiswaan = true }: CreateReportNotificationsInput,
): Promise<void> {
  if (notifyKemahasiswaan && texts.kemahasiswaan) {
    await tx.pemberitahuanStaf.create({
      data: {
        peran: PeranPenerima.KEMAHASISWAAN,
        laporanId,
        judul: texts.kemahasiswaan.judul,
        isi: texts.kemahasiswaan.isi,
        tautanTab: texts.kemahasiswaan.tautanTab,
      },
    });
  }

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
