import { Router } from "express";
import { Prisma, type KegiatanDrc } from "@prisma/client";
import { currentSession, database, requireRole, type Session } from "../auth";
import {
  drcNotification,
  drcProdiOptions,
  drcAngkatanWhere,
  isDrcActivityPast,
  isDrcTargetedTo,
  type DrcNotificationKind,
  type DrcTarget,
} from "../drc";
import { disciplinePillarLabels } from "../points";
import { drcActivitySchema, drcActivityUpdateSchema, parseBody } from "../validation";

// Menu DRC (Disiplin Refresh Competency): Kemahasiswaan mengelola kegiatan,
// mahasiswa melihat jadwal. Setiap pengumuman masuk ke Pemberitahuan mahasiswa
// sesuai target prodi/angkatan kegiatan dan otomatis dikirim ke email mereka
// (lihat notification-email.ts).
export const drcRouter = Router();
drcRouter.use(
  "/admin/drc",
  requireRole(["admin"], "Menu DRC hanya dapat dikelola oleh Kemahasiswaan."),
);

const DRC_TAB = "drc";
const invalidActivityMessage =
  "Lengkapi judul (min. 3 karakter), jenis, semester, tanggal, jam mulai sebelum jam selesai, lokasi, dan minimal satu tema.";

function activityId(value: unknown): number | null {
  return typeof value === "string" && /^\d{1,9}$/.test(value) ? Number(value) : null;
}

function toDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function serialize(activity: KegiatanDrc) {
  return {
    id: activity.id,
    judul: activity.judul,
    jenis: activity.jenis,
    semester: activity.semester,
    tanggal: activity.tanggal.toISOString().slice(0, 10),
    jamMulai: activity.jamMulai,
    jamSelesai: activity.jamSelesai,
    lokasi: activity.lokasi,
    tema: activity.tema,
    deskripsi: activity.deskripsi,
    targetProdi: activity.targetProdi,
    targetAngkatan: activity.targetAngkatan,
    sudahLewat: isDrcActivityPast(activity.tanggal),
    createdAt: activity.createdAt,
    updatedAt: activity.updatedAt,
  };
}

function snapshot(activity: KegiatanDrc): Prisma.InputJsonValue {
  const { createdAt: _createdAt, updatedAt: _updatedAt, sudahLewat: _sudahLewat, ...rest } = serialize(activity);
  return rest;
}

// Satu aturan pencocokan (isDrcTargetedTo) untuk notifikasi, pratinjau, dan
// jadwal mahasiswa, agar yang wajib ikut selalu sama dengan yang diberi tahu.
async function findTargetStudents(client: Prisma.TransactionClient, target: DrcTarget) {
  const students = await client.mahasiswa.findMany({
    where: drcAngkatanWhere(target),
    select: { id: true, email: true, jurusan: true, angkatan: true },
  });
  return students.filter((student) => isDrcTargetedTo(target, student));
}

function recipientSummary(students: { email: string | null }[]) {
  return {
    penerima: students.length,
    denganEmail: students.filter((student) => student.email?.includes("@")).length,
  };
}

// Satu baris Pemberitahuan per mahasiswa target; email dikirim setelah transaksi commit.
async function notifyTargetStudents(
  transaction: Prisma.TransactionClient,
  kind: DrcNotificationKind,
  activity: KegiatanDrc,
): Promise<{ penerima: number; denganEmail: number }> {
  const students = await findTargetStudents(transaction, activity);
  if (students.length === 0) return { penerima: 0, denganEmail: 0 };
  const { judul, isi } = drcNotification(kind, activity);
  await transaction.pemberitahuan.createMany({
    data: students.map((student) => ({ studentId: student.id, judul, isi, tautanTab: DRC_TAB })),
  });
  return recipientSummary(students);
}

function writeAudit(
  transaction: Prisma.TransactionClient,
  session: Session,
  aksi: string,
  entitasId: number,
  nilaiLama: Prisma.InputJsonValue | null,
  nilaiBaru: Prisma.InputJsonValue | null,
) {
  return transaction.logAudit.create({
    data: {
      aktorId: session.profile.id,
      aktorPeran: session.profile.role,
      aksi,
      entitas: "KegiatanDrc",
      entitasId,
      nilaiLama: nilaiLama ?? Prisma.JsonNull,
      nilaiBaru: nilaiBaru ?? Prisma.JsonNull,
    },
  });
}

async function listActivities() {
  const activities = await database.kegiatanDrc.findMany({
    orderBy: [{ tanggal: "desc" }, { jamMulai: "desc" }],
  });
  return activities.map(serialize);
}

const themeOptions = Object.entries(disciplinePillarLabels).map(([kode, label]) => ({ kode, label }));

async function countRecipients(target: DrcTarget) {
  return recipientSummary(await findTargetStudents(database, target));
}

// Pilihan angkatan: angkatan yang ada di data mahasiswa ditambah 5 tahun
// terakhir, agar angkatan baru tetap bisa dipilih sebelum datanya diunggah.
async function angkatanOptions(): Promise<number[]> {
  const rows = await database.mahasiswa.findMany({
    where: { angkatan: { not: null } },
    distinct: ["angkatan"],
    select: { angkatan: true },
  });
  const currentYear = new Date().getFullYear();
  const recentYears = Array.from({ length: 5 }, (_, index) => currentYear - index);
  return [...new Set([...rows.map((row) => row.angkatan!), ...recentYears])].sort((a, b) => b - a);
}

function parseTargetQuery(query: Record<string, unknown>): DrcTarget | null {
  const list = (value: unknown) =>
    typeof value === "string" && value.trim() ? value.split(",").map((item) => item.trim()) : [];
  const targetProdi = list(query.prodi);
  const angkatanText = list(query.angkatan);
  if (!targetProdi.every((prodi) => (drcProdiOptions as readonly string[]).includes(prodi))) return null;
  if (!angkatanText.every((year) => /^\d{4}$/.test(year))) return null;
  return { targetProdi, targetAngkatan: angkatanText.map(Number) };
}

drcRouter.get("/admin/drc", async (_request, response) => {
  try {
    const [kegiatan, semua, angkatan] = await Promise.all([
      listActivities(),
      countRecipients({ targetProdi: [], targetAngkatan: [] }),
      angkatanOptions(),
    ]);
    response.json({
      kegiatan,
      tema: themeOptions,
      pilihan: { prodi: drcProdiOptions, angkatan },
      jumlahMahasiswa: semua.penerima,
      jumlahMahasiswaEmail: semua.denganEmail,
    });
  } catch (error) {
    console.error("Gagal memuat kegiatan DRC:", error);
    response.status(500).json({ message: "Data kegiatan DRC gagal dimuat." });
  }
});

// Pratinjau jumlah penerima sebelum kegiatan disimpan.
drcRouter.get("/admin/drc/penerima", async (request, response) => {
  const target = parseTargetQuery(request.query);
  if (!target) {
    response.status(400).json({ message: "Pilihan prodi atau angkatan tidak valid." });
    return;
  }
  try {
    response.json(await countRecipients(target));
  } catch (error) {
    console.error("Gagal menghitung penerima DRC:", error);
    response.status(500).json({ message: "Jumlah penerima gagal dihitung." });
  }
});

drcRouter.post("/admin/drc", async (request, response) => {
  const session = currentSession(response);
  const body = parseBody(drcActivitySchema, request.body);
  if (!body) {
    response.status(400).json({ message: invalidActivityMessage });
    return;
  }
  try {
    const result = await database.$transaction(async (transaction) => {
      const activity = await transaction.kegiatanDrc.create({
        data: { ...body, tanggal: toDateOnly(body.tanggal), dibuatOleh: session.profile.id },
      });
      await writeAudit(transaction, session, "DRC_DITAMBAH", activity.id, null, snapshot(activity));
      const notifikasi = await notifyTargetStudents(transaction, "BARU", activity);
      return { activity, notifikasi };
    });
    response.status(201).json({ kegiatan: serialize(result.activity), notifikasi: result.notifikasi });
  } catch (error) {
    console.error("Gagal menambah kegiatan DRC:", error);
    response.status(500).json({ message: "Kegiatan DRC gagal disimpan." });
  }
});

drcRouter.patch("/admin/drc/:id", async (request, response) => {
  const session = currentSession(response);
  const id = activityId(request.params.id);
  const body = parseBody(drcActivityUpdateSchema, request.body);
  if (!id || !body) {
    response.status(400).json({ message: invalidActivityMessage });
    return;
  }
  const { beritahuMahasiswa, ...fields } = body;
  try {
    const result = await database.$transaction(async (transaction) => {
      const before = await transaction.kegiatanDrc.findUnique({ where: { id } });
      if (!before) return null;
      const activity = await transaction.kegiatanDrc.update({
        where: { id },
        data: { ...fields, tanggal: toDateOnly(fields.tanggal) },
      });
      await writeAudit(transaction, session, "DRC_DIUBAH", id, snapshot(before), snapshot(activity));
      const notifikasi = beritahuMahasiswa
        ? await notifyTargetStudents(transaction, "DIUBAH", activity)
        : { penerima: 0, denganEmail: 0 };
      return { activity, notifikasi };
    });
    if (!result) {
      response.status(404).json({ message: "Kegiatan DRC tidak ditemukan." });
      return;
    }
    response.json({ kegiatan: serialize(result.activity), notifikasi: result.notifikasi });
  } catch (error) {
    console.error("Gagal mengubah kegiatan DRC:", error);
    response.status(500).json({ message: "Perubahan kegiatan DRC gagal disimpan." });
  }
});

// Kegiatan yang belum lewat diberitahukan batal; yang sudah lewat dihapus diam-diam.
drcRouter.delete("/admin/drc/:id", async (request, response) => {
  const session = currentSession(response);
  const id = activityId(request.params.id);
  if (!id) {
    response.status(400).json({ message: "Kegiatan DRC tidak valid." });
    return;
  }
  try {
    const result = await database.$transaction(async (transaction) => {
      const activity = await transaction.kegiatanDrc.findUnique({ where: { id } });
      if (!activity) return null;
      await transaction.kegiatanDrc.delete({ where: { id } });
      await writeAudit(transaction, session, "DRC_DIHAPUS", id, snapshot(activity), null);
      return isDrcActivityPast(activity.tanggal)
        ? { penerima: 0, denganEmail: 0 }
        : await notifyTargetStudents(transaction, "DIBATALKAN", activity);
    });
    if (!result) {
      response.status(404).json({ message: "Kegiatan DRC tidak ditemukan." });
      return;
    }
    response.json({ notifikasi: result });
  } catch (error) {
    console.error("Gagal menghapus kegiatan DRC:", error);
    response.status(500).json({ message: "Kegiatan DRC gagal dihapus." });
  }
});

drcRouter.get(
  "/drc",
  requireRole(["mhs"], "Jadwal DRC hanya tersedia untuk akun mahasiswa."),
  async (_request, response) => {
    const session = currentSession(response);
    try {
      const [activities, student] = await Promise.all([
        listActivities(),
        database.mahasiswa.findUnique({
          where: { id: session.profile.id },
          select: { jurusan: true, angkatan: true },
        }),
      ]);
      // Mahasiswa hanya melihat kegiatan yang wajib ia ikuti.
      const kegiatan = student ? activities.filter((activity) => isDrcTargetedTo(activity, student)) : [];
      response.json({ kegiatan, tema: themeOptions });
    } catch (error) {
      console.error("Gagal memuat jadwal DRC mahasiswa:", error);
      response.status(500).json({ message: "Jadwal DRC gagal dimuat." });
    }
  },
);
