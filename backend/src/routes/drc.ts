import { Router } from "express";
import { Prisma, type KegiatanDrc } from "@prisma/client";
import { currentSession, database, requireRole, type Session } from "../auth";
import {
  drcEvidenceStatus,
  drcEvidenceWindow,
  drcNotification,
  drcAngkatanWhere,
  isDrcActivityPast,
  isDrcTargetedTo,
  uniqueProdiOptions,
  type DrcNotificationKind,
  type DrcTarget,
} from "../drc";
import {
  discardEvidenceFile,
  prepareEvidenceFile,
  receiveEvidenceFile,
  sendEvidenceFile,
  storeEvidenceFile,
} from "../evidence-file";
import { disciplinePillarLabels } from "../points";
import { drcActivitySchema, drcActivityUpdateSchema, drcEvidenceSchema, parseBody } from "../validation";

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
    sudahLewat: isDrcActivityPast(activity),
    unggahBukti: {
      dibuka: drcEvidenceWindow(activity).dibuka,
      ditutup: drcEvidenceWindow(activity).ditutup,
    },
    createdAt: activity.createdAt,
    updatedAt: activity.updatedAt,
  };
}

function snapshot(activity: KegiatanDrc): Prisma.InputJsonValue {
  const { createdAt: _createdAt, updatedAt: _updatedAt, sudahLewat: _sudahLewat, unggahBukti: _unggahBukti, ...rest } = serialize(activity);
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

// Pilihan prodi dan angkatan mengikuti data mahasiswa yang ada di database.
async function targetOptions(): Promise<{ prodi: string[]; angkatan: number[] }> {
  const [prodiRows, angkatanRows] = await Promise.all([
    database.mahasiswa.findMany({ distinct: ["jurusan"], select: { jurusan: true } }),
    database.mahasiswa.findMany({
      where: { angkatan: { not: null } },
      distinct: ["angkatan"],
      select: { angkatan: true },
    }),
  ]);
  return {
    prodi: uniqueProdiOptions(prodiRows.map((row) => row.jurusan)),
    angkatan: angkatanRows.map((row) => row.angkatan!).sort((a, b) => b - a),
  };
}

function parseTargetQuery(query: Record<string, unknown>): DrcTarget | null {
  const list = (value: unknown) =>
    typeof value === "string" && value.trim() ? value.split(",").map((item) => item.trim()) : [];
  const targetProdi = list(query.prodi);
  const angkatanText = list(query.angkatan);
  if (targetProdi.length > 50 || !targetProdi.every((prodi) => prodi && prodi.length <= 200)) return null;
  if (!angkatanText.every((year) => /^\d{4}$/.test(year))) return null;
  return { targetProdi, targetAngkatan: angkatanText.map(Number) };
}

drcRouter.get("/admin/drc", async (_request, response) => {
  try {
    const [kegiatan, semua, pilihan] = await Promise.all([
      listActivities(),
      countRecipients({ targetProdi: [], targetAngkatan: [] }),
      targetOptions(),
    ]);
    response.json({
      kegiatan,
      tema: themeOptions,
      pilihan,
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
      const activity = await transaction.kegiatanDrc.findUnique({
        where: { id },
        include: { bukti: { select: { buktiFileName: true } } },
      });
      if (!activity) return null;
      // BuktiDrc ikut terhapus (cascade); file-nya di BuktiFoto dihapus manual.
      await transaction.kegiatanDrc.delete({ where: { id } });
      await transaction.buktiFoto.deleteMany({
        where: { fileName: { in: activity.bukti.map((item) => item.buktiFileName) } },
      });
      await writeAudit(transaction, session, "DRC_DIHAPUS", id, snapshot(activity), null);
      return isDrcActivityPast(activity)
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

const evidenceSelect = { id: true, catatan: true, createdAt: true, updatedAt: true } satisfies Prisma.BuktiDrcSelect;

// Peserta wajib beserta bukti kehadirannya. Bukti dari mahasiswa yang sudah
// tidak termasuk target (target diubah setelah unggah) tetap ditampilkan.
drcRouter.get("/admin/drc/:id/peserta", async (request, response) => {
  const id = activityId(request.params.id);
  if (!id) {
    response.status(400).json({ message: "Kegiatan DRC tidak valid." });
    return;
  }
  try {
    const activity = await database.kegiatanDrc.findUnique({ where: { id } });
    if (!activity) {
      response.status(404).json({ message: "Kegiatan DRC tidak ditemukan." });
      return;
    }
    const studentSelect = { id: true, nim: true, nama: true, jurusan: true, angkatan: true } as const;
    const [students, evidence] = await Promise.all([
      database.mahasiswa.findMany({ where: drcAngkatanWhere(activity), select: studentSelect }),
      database.buktiDrc.findMany({
        where: { kegiatanId: id },
        orderBy: { createdAt: "asc" },
        select: { ...evidenceSelect, student: { select: studentSelect } },
      }),
    ]);
    const submittedIds = new Set(evidence.map((item) => item.student.id));
    const targeted = students.filter((student) => isDrcTargetedTo(activity, student));
    const targetedIds = new Set(targeted.map((student) => student.id));
    const sudahUnggah = evidence.map(({ student, ...bukti }) => ({
      ...student,
      bukti,
      diluarTarget: !targetedIds.has(student.id),
    }));
    const belumUnggah = targeted
      .filter((student) => !submittedIds.has(student.id))
      .sort((a, b) => a.nim - b.nim);
    response.json({
      kegiatan: serialize(activity),
      sudahUnggah,
      belumUnggah,
      jumlahTarget: targeted.length,
    });
  } catch (error) {
    console.error("Gagal memuat peserta DRC:", error);
    response.status(500).json({ message: "Data peserta DRC gagal dimuat." });
  }
});

drcRouter.get(
  "/drc",
  requireRole(["mhs"], "Jadwal DRC hanya tersedia untuk akun mahasiswa."),
  async (_request, response) => {
    const session = currentSession(response);
    try {
      const [activities, student, evidence] = await Promise.all([
        listActivities(),
        database.mahasiswa.findUnique({
          where: { id: session.profile.id },
          select: { jurusan: true, angkatan: true },
        }),
        database.buktiDrc.findMany({
          where: { studentId: session.profile.id },
          select: { ...evidenceSelect, kegiatanId: true },
        }),
      ]);
      const evidenceByActivity = new Map(evidence.map(({ kegiatanId, ...bukti }) => [kegiatanId, bukti]));
      // Mahasiswa hanya melihat kegiatan yang wajib ia ikuti.
      const kegiatan = (student ? activities.filter((activity) => isDrcTargetedTo(activity, student)) : []).map(
        (activity) => ({
          ...activity,
          buktiSaya: evidenceByActivity.get(activity.id) ?? null,
          statusUnggahBukti: drcEvidenceStatus({ ...activity, tanggal: new Date(`${activity.tanggal}T00:00:00.000Z`) }),
        }),
      );
      response.json({ kegiatan, tema: themeOptions });
    } catch (error) {
      console.error("Gagal memuat jadwal DRC mahasiswa:", error);
      response.status(500).json({ message: "Jadwal DRC gagal dimuat." });
    }
  },
);

// Mahasiswa peserta mengunggah bukti kehadiran (foto/sertifikat) selama kegiatan
// berlangsung hingga 30 menit setelah selesai. Unggah ulang menggantikan bukti sebelumnya.
drcRouter.post(
  "/drc/:id/bukti",
  requireRole(["mhs"], "Bukti DRC hanya dapat diunggah oleh mahasiswa."),
  receiveEvidenceFile("bukti"),
  async (request, response) => {
    const session = currentSession(response);
    const id = activityId(request.params.id);
    const body = parseBody(drcEvidenceSchema, request.body);
    if (!id || !body) {
      response.status(400).json({ message: "Catatan bukti maksimal 500 karakter." });
      return;
    }
    if (!request.file) {
      response.status(400).json({ message: "Lampirkan foto atau sertifikat kehadiran (JPEG, PNG, atau PDF)." });
      return;
    }
    let storedFileName: string | null = null;
    try {
      const [activity, student] = await Promise.all([
        database.kegiatanDrc.findUnique({ where: { id } }),
        database.mahasiswa.findUnique({
          where: { id: session.profile.id },
          select: { jurusan: true, angkatan: true },
        }),
      ]);
      if (!activity || !student || !isDrcTargetedTo(activity, student)) {
        response.status(404).json({ message: "Kegiatan DRC tidak ditemukan." });
        return;
      }
      const evidenceStatus = drcEvidenceStatus(activity);
      if (evidenceStatus !== "DIBUKA") {
        response.status(400).json({
          message:
            evidenceStatus === "BELUM_DIBUKA"
              ? `Bukti baru dapat diunggah saat kegiatan dimulai (${activity.jamMulai} WITA).`
              : "Waktu unggah bukti sudah ditutup (30 menit setelah kegiatan selesai).",
        });
        return;
      }
      const evidence = await prepareEvidenceFile(request.file);
      if (!evidence) {
        response.status(400).json({ message: "File PDF tidak valid." });
        return;
      }
      await storeEvidenceFile(evidence);
      storedFileName = evidence.fileName;
      const bukti = await database.$transaction(async (transaction) => {
        const key = { kegiatanId_studentId: { kegiatanId: id, studentId: session.profile.id } };
        const previous = await transaction.buktiDrc.findUnique({ where: key, select: { buktiFileName: true } });
        const saved = await transaction.buktiDrc.upsert({
          where: key,
          create: { kegiatanId: id, studentId: session.profile.id, buktiFileName: evidence.fileName, catatan: body.catatan },
          update: { buktiFileName: evidence.fileName, catatan: body.catatan },
          select: evidenceSelect,
        });
        if (previous) await transaction.buktiFoto.deleteMany({ where: { fileName: previous.buktiFileName } });
        return saved;
      });
      response.status(201).json({ bukti });
    } catch (error) {
      await discardEvidenceFile(storedFileName);
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        response.status(409).json({ message: "Bukti sedang diproses. Muat ulang dan coba lagi." });
        return;
      }
      console.error("Gagal menyimpan bukti DRC:", error);
      response.status(500).json({ message: "Bukti DRC gagal diunggah. Silakan coba kembali." });
    }
  },
);

// File bukti DRC hanya untuk mahasiswa pemilik dan Kemahasiswaan.
drcRouter.get(
  "/drc/bukti/:id",
  requireRole(["mhs", "admin"], "Anda tidak berhak melihat bukti ini."),
  async (request, response) => {
    const session = currentSession(response);
    const id = activityId(request.params.id);
    if (!id) {
      response.status(404).json({ message: "Bukti tidak ditemukan." });
      return;
    }
    try {
      const evidence = await database.buktiDrc.findFirst({
        where: { id, ...(session.profile.role === "mhs" ? { studentId: session.profile.id } : {}) },
        select: { buktiFileName: true },
      });
      const file = evidence
        ? await database.buktiFoto.findUnique({
            where: { fileName: evidence.buktiFileName },
            select: { mimeType: true, data: true },
          })
        : null;
      if (!file) {
        response.status(404).json({ message: "Bukti tidak ditemukan." });
        return;
      }
      sendEvidenceFile(response, file, evidence!.buktiFileName, `bukti-drc-${id}`);
    } catch (error) {
      console.error("Gagal memuat bukti DRC:", error);
      response.status(500).json({ message: "Bukti gagal dimuat." });
    }
  },
);
