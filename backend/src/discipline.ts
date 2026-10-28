import { randomBytes } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Router, type Request, type Response } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import multer from "multer";
import sharp from "sharp";
import {
  DisciplinePillar,
  JenisLaporan,
  JenisPembinaan,
  PeranPenerima,
  Prisma,
  StatusLaporan,
  StatusPembinaan,
  StatusSanggahan,
  ViolationSeverity,
} from "@prisma/client";
import {
  calculatePointChangeForDelta,
  getPointChangeMetadata,
  disciplinePillarLabels,
  violationSeverityLabels,
  violationSeverityFollowUps,
  type PointChangeType,
} from "./points";
import { sendPointDeductionEmail } from "./mailer";
import { database, getSessionForRequest, type Session } from "./auth";
import { createTrackingCode, hashTrackingCode } from "./report-security";
import { appealSchema, parseBody, trainingEvidenceSchema } from "./validation";
import {
  buildReportNotificationTexts,
  createReportNotifications,
  isValidNimFormat,
  resolveReportRoute,
} from "./report-routing";

const reportRouter = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (_request, file, callback) => {
    if (!["image/jpeg", "image/png"].includes(file.mimetype)) {
      callback(new Error("Bukti hanya boleh berupa foto JPEG atau PNG."));
      return;
    }
    callback(null, true);
  },
});
const evidenceDirectory = resolve(process.cwd(), "uploads", "evidence");
const pillarValues = Object.values(DisciplinePillar);
const severityValues = Object.values(ViolationSeverity);
const reportKinds = Object.values(JenisLaporan);
const reportDecisions = ["DIVERIFIKASI", "DITOLAK"] as const;

function parsePositiveInteger(value: unknown): number | null {
  if (
    typeof value !== "string" ||
    !/^\d+$/.test(value) ||
    !Number.isSafeInteger(Number(value)) ||
    Number(value) < 1
  ) {
    return null;
  }
  return Number(value);
}

function formatDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function parseDateOnly(value: unknown): Date | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || formatDateOnly(date) !== value
    ? null
    : date;
}

function getSession(request: Request, response: Response): Session | null {
  return getSessionForRequest(request, response);
}

function requireLogin(request: Request, response: Response): Session | null {
  const session = getSession(request, response);
  if (!session) {
    response.status(401).json({ message: "Sesi login tidak ditemukan atau sudah berakhir." });
    return null;
  }
  return session;
}

function requireStudent(request: Request, response: Response): Session | null {
  const session = requireLogin(request, response);
  if (session && session.profile.role !== "mhs") {
    response.status(403).json({ message: "Fitur ini hanya tersedia untuk mahasiswa." });
    return null;
  }
  return session;
}

function requireDosen(request: Request, response: Response): Session | null {
  const session = requireLogin(request, response);
  if (session && session.profile.role !== "dosen") {
    response.status(403).json({ message: "Fitur ini hanya tersedia untuk dosen." });
    return null;
  }
  return session;
}

function requireAdmin(request: Request, response: Response): Session | null {
  const session = requireLogin(request, response);
  if (session && session.profile.role !== "admin") {
    response.status(403).json({ message: "Fitur ini hanya tersedia untuk admin kemahasiswaan." });
    return null;
  }
  return session;
}

function reportRateLimitKey(
  request: Request,
  response: Response,
): string {
  const session = getSession(request, response);
  return session
    ? `user:${session.profile.role}:${session.profile.id}`
    : `ip:${ipKeyGenerator(request.ip ?? "")}`;
}

const createReportLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  limit: 5,
  keyGenerator: reportRateLimitKey,
  message: { message: "Batas laporan harian tercapai. Silakan coba kembali setelah 24 jam." },
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

const checkReportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: { message: "Terlalu banyak percobaan cek status. Silakan coba kembali nanti." },
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

function writeAudit(
  transaction: Prisma.TransactionClient,
  session: Session,
  action: string,
  entity: string,
  entityId: number,
) {
  return transaction.logAudit.create({
    data: {
      aktorId: session.profile.id,
      aktorPeran: session.profile.role,
      aksi: action,
      entitas: entity,
      entitasId: entityId,
    },
  });
}

reportRouter.get("/aturan", async (request, response) => {
  if (!requireLogin(request, response)) return;
  try {
    const aturan = await database.aturanPelanggaran.findMany({
      where: { aktif: true },
      orderBy: [{ pillar: "asc" }, { nama: "asc" }],
      select: { id: true, pillar: true, nama: true, severity: true, bobotPoin: true },
    });
    response.json({ aturan });
  } catch (error) {
    console.error("Gagal memuat aturan pelanggaran:", error);
    response.status(500).json({ message: "Daftar aturan pelanggaran gagal dimuat." });
  }
});

reportRouter.post(
  "/laporan",
  createReportLimiter,
  (request, response, next) => {
    if (!requireLogin(request, response)) return;
    next();
  },
  upload.single("bukti"),
  async (request, response) => {
    let savedEvidencePath: string | null = null;
    try {
      const jenis = request.body.jenis as JenisLaporan;
      const pillar = request.body.pillar as DisciplinePillar;
      const aturanId = request.body.aturanId
        ? parsePositiveInteger(request.body.aturanId)
        : null;
      const severityUsulan = request.body.severityUsulan
        ? (request.body.severityUsulan as ViolationSeverity)
        : null;
      const modeTerlapor = request.body.modeTerlapor;
      const diketahui = modeTerlapor === "DIKETAHUI";
      const terlaporNama =
        diketahui && typeof request.body.terlaporNama === "string"
          ? request.body.terlaporNama.trim().replace(/\s+/g, " ")
          : "";
      const terlaporNim =
        diketahui && typeof request.body.terlaporNim === "string"
          ? request.body.terlaporNim.trim()
          : "";
      const terlaporKeterangan =
        typeof request.body.terlaporKeterangan === "string"
          ? request.body.terlaporKeterangan.trim()
          : "";
      const lokasi =
        typeof request.body.lokasi === "string" ? request.body.lokasi.trim() : "";
      const tanggalKejadian = parseDateOnly(request.body.tanggalKejadian);
      const deskripsi =
        typeof request.body.deskripsi === "string"
          ? request.body.deskripsi.trim()
          : "";
      const today = formatDateOnly(new Date());
      const pernyataanBenar =
        request.body.pernyataanBenar === "true" ||
        request.body.pernyataanBenar === "on";

      if (
        !reportKinds.includes(jenis) ||
        !pillarValues.includes(pillar) ||
        (modeTerlapor !== "DIKETAHUI" && modeTerlapor !== "TIDAK_DIKETAHUI") ||
        (request.body.aturanId && aturanId === null) ||
        (severityUsulan && !severityValues.includes(severityUsulan)) ||
        (diketahui &&
          (!terlaporNama ||
            terlaporNama.length > 200 ||
            !isValidNimFormat(terlaporNim))) ||
        (!diketahui && terlaporKeterangan.length < 5) ||
        terlaporKeterangan.length > 500 ||
        !lokasi ||
        lokasi.length > 300 ||
        !tanggalKejadian ||
        formatDateOnly(tanggalKejadian) > today ||
        deskripsi.length < 20 ||
        deskripsi.length > 1000 ||
        !pernyataanBenar
      ) {
        response.status(400).json({ message: "Periksa kembali data laporan dan pernyataan kebenaran." });
        return;
      }

      if (!request.file) {
        response.status(400).json({ message: "Foto bukti wajib diunggah sebelum mengirim laporan." });
        return;
      }

      if (aturanId !== null) {
        const rule = await database.aturanPelanggaran.findFirst({
          where: { id: aturanId, pillar, aktif: true },
          select: { id: true },
        });
        if (!rule) {
          response.status(400).json({ message: "Kategori aturan tidak sesuai dengan pilar yang dipilih." });
          return;
        }
      }

      const isJpeg = request.file.mimetype === "image/jpeg";
      const isPng = request.file.mimetype === "image/png";
      if (!isJpeg && !isPng) {
        response.status(400).json({ message: "Bukti hanya boleh berupa foto JPEG atau PNG." });
        return;
      }
      const extension = isJpeg ? "jpg" : "png";
      const fileName = `${randomBytes(18).toString("hex")}.${extension}`;
      const normalizedImage = await sharp(request.file.buffer)
        .rotate()
        [isJpeg ? "jpeg" : "png"]()
        .toBuffer();
      await mkdir(evidenceDirectory, { recursive: true });
      savedEvidencePath = resolve(evidenceDirectory, fileName);
      await writeFile(savedEvidencePath, normalizedImage, { flag: "wx" });
      const buktiPath = `/uploads/evidence/${fileName}`;

      const session = requireLogin(request, response);
      if (!session) {
        if (savedEvidencePath) await unlink(savedEvidencePath);
        return;
      }
      const kodePelacakan = createTrackingCode();
      await database.$transaction(async (transaction) => {
        const route = await resolveReportRoute(transaction, {
          diketahui,
          nama: terlaporNama,
          nim: terlaporNim,
        });
        const laporan = await transaction.laporan.create({
          data: {
            kodeHash: hashTrackingCode(kodePelacakan),
            jenis,
            pillar,
            aturanId,
            severityUsulan,
            terlaporNama: diketahui ? terlaporNama : null,
            terlaporNim: diketahui ? terlaporNim : null,
            terlaporKeterangan: terlaporKeterangan || null,
            terlaporId: route.jalur === "TERIDENTIFIKASI" ? route.student.id : null,
            jalur: route.jalur,
            lokasi,
            tanggalKejadian,
            deskripsi,
            buktiPath,
            tanggalLapor: new Date(`${today}T00:00:00.000Z`),
          },
          select: { id: true },
        });
        const texts = buildReportNotificationTexts({
          jenis,
          pillar,
          tanggalKejadian,
          route,
          terlaporNama: diketahui ? terlaporNama : null,
          terlaporNim: diketahui ? terlaporNim : null,
        });
        await createReportNotifications(transaction, {
          laporanId: laporan.id,
          route,
          texts,
        });
      });
      response.status(201).json({ kodePelacakan });
    } catch (error) {
      console.error("Gagal menyimpan laporan:", error);
      if (savedEvidencePath) {
        await unlink(savedEvidencePath).catch(() => undefined);
      }
      response.status(500).json({ message: "Laporan gagal dikirim. Silakan coba kembali." });
    }
  },
);

reportRouter.get("/laporan/status", checkReportLimiter, async (request, response) => {
  const code = typeof request.query.kode === "string" ? request.query.kode.trim().toUpperCase() : "";
  if (!/^[A-Z2-7]{32}$/.test(code)) {
    response.status(404).json({ message: "Kode pelacakan tidak ditemukan." });
    return;
  }
  try {
    const report = await database.laporan.findUnique({
      where: { kodeHash: hashTrackingCode(code) },
      select: { status: true, catatanUntukPelapor: true, tanggalLapor: true },
    });
    if (!report) {
      response.status(404).json({ message: "Kode pelacakan tidak ditemukan." });
      return;
    }
    response.json({
      status: report.status,
      catatanUntukPelapor: report.catatanUntukPelapor,
      tanggalLapor: formatDateOnly(report.tanggalLapor),
    });
  } catch (error) {
    console.error("Gagal memeriksa status laporan:", error);
    response.status(500).json({ message: "Status laporan gagal diperiksa." });
  }
});

reportRouter.get("/mahasiswa/tindak-lanjut", async (request, response) => {
  const session = requireStudent(request, response);
  if (!session) return;
  try {
    const reports = await database.laporan.findMany({
      where: {
        terlaporId: session.profile.id,
        status: {
          in: [
            StatusLaporan.DITERIMA,
            StatusLaporan.DIVERIFIKASI,
            StatusLaporan.DITINDAKLANJUTI,
            StatusLaporan.SELESAI,
            StatusLaporan.DITOLAK,
          ],
        },
        jenis: JenisLaporan.TEMUAN,
      },
      orderBy: { id: "desc" },
      select: {
        id: true,
        pillar: true,
        tanggalKejadian: true,
        deskripsi: true,
        status: true,
        aturan: { select: { nama: true } },
        perubahanPoin: {
          select: {
            id: true,
            delta: true,
            reason: true,
            severity: true,
            sanggahans: {
              select: { id: true, status: true, catatanPemeriksa: true },
              orderBy: { createdAt: "desc" },
              take: 1,
            },
            pembinaans: {
              select: {
                id: true,
                jenis: true,
                instruksi: true,
                status: true,
                buktiUrl: true,
              },
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
      },
    });
    response.json({
      tindakLanjut: reports.map((report) => ({
        id: report.id,
        perubahanPoinId: report.perubahanPoin?.id ?? null,
        pillar: report.pillar,
        severity: report.perubahanPoin?.severity ?? null,
        tanggalKejadian: formatDateOnly(report.tanggalKejadian),
        status: report.status,
        pointsDeducted: Math.abs(report.perubahanPoin?.delta ?? 0),
        reason: report.perubahanPoin?.reason ?? report.deskripsi,
        aturan: report.aturan?.nama ?? null,
        followUp: report.perubahanPoin?.severity
          ? violationSeverityFollowUps[report.perubahanPoin.severity]
          : null,
        sanggahan: report.perubahanPoin?.sanggahans[0] ?? null,
        pembinaan: report.perubahanPoin?.pembinaans[0] ?? null,
      })),
    });
  } catch (error) {
    console.error("Gagal memuat tindak lanjut mahasiswa:", error);
    response.status(500).json({ message: "Data tindak lanjut gagal dimuat." });
  }
});

reportRouter.get("/mahasiswa/sanggahan", async (request, response) => {
  const session = requireStudent(request, response);
  if (!session) return;
  try {
    const sanggahan = await database.sanggahan.findMany({
      where: { studentId: session.profile.id },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        alasan: true,
        status: true,
        catatanPemeriksa: true,
        createdAt: true,
        perubahanPoin: {
          select: { id: true, type: true, reason: true, delta: true },
        },
      },
    });
    response.json({ sanggahan });
  } catch (error) {
    console.error("Gagal memuat sanggahan mahasiswa:", error);
    response.status(500).json({ message: "Daftar sanggahan gagal dimuat." });
  }
});

reportRouter.post("/sanggahan", async (request, response) => {
  const session = requireStudent(request, response);
  if (!session) return;
  const appeal = parseBody(appealSchema, request.body);
  if (!appeal) {
    response.status(400).json({ message: "Pilih perubahan poin dan isi alasan sanggahan (20–2000 karakter)." });
    return;
  }
  const { perubahanPoinId, alasan } = appeal;
  try {
    const result = await database.$transaction(
      async (transaction) => {
        const change = await transaction.pointChange.findFirst({
          where: {
            id: perubahanPoinId,
            studentId: session.profile.id,
            delta: { lt: 0 },
          },
          select: { id: true, student: { select: { nama: true, nim: true, dosenPaId: true } } },
        });
        if (!change) return { kind: "not_found" as const };
        const activeAppeal = await transaction.sanggahan.findFirst({
          where: { perubahanPoinId, status: StatusSanggahan.DIAJUKAN },
          select: { id: true },
        });
        if (activeAppeal) return { kind: "duplicate" as const };
        const sanggahan = await transaction.sanggahan.create({
          data: { perubahanPoinId, studentId: session.profile.id, alasan },
          select: { id: true, status: true, createdAt: true },
        });
        if (change.student.dosenPaId) {
          await transaction.pemberitahuanStaf.create({
            data: {
              peran: PeranPenerima.DOSEN,
              dosenId: change.student.dosenPaId,
              judul: "Sanggahan baru dari mahasiswa bimbingan",
              isi: `${change.student.nama} (${change.student.nim}) mengajukan sanggahan atas perubahan poin. Tinjau di menu Catatan & Konseling.`,
              tautanTab: "konseling",
            },
          });
        }
        return { kind: "created" as const, sanggahan };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    if (result.kind === "not_found") {
      response.status(404).json({ message: "Perubahan poin tidak ditemukan atau bukan milik Anda." });
      return;
    }
    if (result.kind === "duplicate") {
      response.status(409).json({ message: "Sanggahan untuk perubahan poin ini sedang diperiksa." });
      return;
    }
    response.status(201).json({ sanggahan: result.sanggahan });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      response.status(409).json({ message: "Sanggahan bersamaan terdeteksi. Silakan muat ulang dan coba kembali." });
      return;
    }
    console.error("Gagal menyimpan sanggahan mahasiswa:", error);
    response.status(500).json({ message: "Sanggahan gagal disimpan." });
  }
});

reportRouter.get("/mahasiswa/pembinaan", async (request, response) => {
  const session = requireStudent(request, response);
  if (!session) return;
  try {
    const pembinaan = await database.pembinaan.findMany({
      where: { studentId: session.profile.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        jenis: true,
        instruksi: true,
        status: true,
        isiRefleksi: true,
        buktiUrl: true,
        catatanPemeriksa: true,
        createdAt: true,
        perubahanPoin: { select: { reason: true, pillar: true, severity: true } },
      },
    });
    response.json({ pembinaan });
  } catch (error) {
    console.error("Gagal memuat pembinaan mahasiswa:", error);
    response.status(500).json({ message: "Data pembinaan gagal dimuat." });
  }
});

reportRouter.post("/pembinaan/:id/bukti", async (request, response) => {
  const session = requireStudent(request, response);
  if (!session) return;
  const id = parsePositiveInteger(request.params.id);
  const evidence = parseBody(trainingEvidenceSchema, request.body);
  if (!id || !evidence) {
    response.status(400).json({ message: "Masukkan tautan bukti HTTP/HTTPS yang valid dan catatan maksimal 5000 karakter." });
    return;
  }
  const { buktiUrl, catatan } = evidence;
  try {
    const submitted = await database.$transaction(async (transaction) => {
      const training = await transaction.pembinaan.findFirst({
        where: {
          id,
          studentId: session.profile.id,
          status: { in: [StatusPembinaan.DIMINTA, StatusPembinaan.DITOLAK] },
        },
        include: {
          student: { select: { dosenPaId: true } },
          perubahanPoin: { select: { laporan: { select: { id: true } } } },
        },
      });
      if (!training) return false;
      const updated = await transaction.pembinaan.updateMany({
        where: {
          id,
          studentId: session.profile.id,
          status: { in: [StatusPembinaan.DIMINTA, StatusPembinaan.DITOLAK] },
        },
        data: {
          buktiUrl,
          isiRefleksi: catatan || null,
          status: StatusPembinaan.DIKIRIM,
          catatanPemeriksa: null,
        },
      });
      if (updated.count === 0) return false;

      await transaction.pemberitahuanStaf.create({
        data: {
          peran: training.student.dosenPaId
            ? PeranPenerima.DOSEN
            : PeranPenerima.KEMAHASISWAAN,
          dosenId: training.student.dosenPaId,
          laporanId: training.perubahanPoin.laporan?.id,
          judul: training.student.dosenPaId
            ? "Bukti tindak lanjut menunggu pemeriksaan"
            : "Bukti tindak lanjut menunggu penetapan Dosen PA",
          isi: training.student.dosenPaId
            ? "Mahasiswa telah mengirim bukti penyelesaian. Tinjau dan setujui atau minta perbaikan."
            : "Mahasiswa telah mengirim bukti, tetapi belum memiliki Dosen PA untuk memeriksanya.",
          tautanTab: training.student.dosenPaId ? "laporan-dpa" : "laporan",
        },
      });
      return true;
    });
    if (!submitted) {
      response.status(404).json({ message: "Tugas tindak lanjut tidak ditemukan atau tidak dapat dikirim." });
      return;
    }
    response.json({ message: "Bukti tindak lanjut berhasil dikirim kepada Dosen PA." });
  } catch (error) {
    console.error("Gagal mengirim bukti tindak lanjut mahasiswa:", error);
    response.status(500).json({ message: "Bukti tindak lanjut gagal dikirim." });
  }
});

reportRouter.post("/pembinaan/:id/refleksi", async (request, response) => {
  const session = requireStudent(request, response);
  if (!session) return;
  const id = parsePositiveInteger(request.params.id);
  const isiRefleksi =
    typeof request.body?.isiRefleksi === "string"
      ? request.body.isiRefleksi.trim()
      : "";
  if (!id || isiRefleksi.length < 100 || isiRefleksi.length > 5000) {
    response.status(400).json({ message: "Refleksi harus berisi 100–5000 karakter." });
    return;
  }
  try {
    const submitted = await database.$transaction(async (transaction) => {
      const training = await transaction.pembinaan.findFirst({
        where: { id, studentId: session.profile.id, status: StatusPembinaan.DIMINTA },
        include: {
          student: { select: { dosenPaId: true } },
          perubahanPoin: { select: { laporan: { select: { id: true } } } },
        },
      });
      if (!training) return false;
      const updated = await transaction.pembinaan.updateMany({
        where: { id, studentId: session.profile.id, status: StatusPembinaan.DIMINTA },
        data: { isiRefleksi, status: StatusPembinaan.DIKIRIM },
      });
      if (updated.count === 0) return false;
      const dosenPaId = training.student.dosenPaId;
      await transaction.pemberitahuanStaf.create({
        data: {
          peran: dosenPaId ? PeranPenerima.DOSEN : PeranPenerima.KEMAHASISWAAN,
          dosenId: dosenPaId,
          laporanId: training.perubahanPoin.laporan?.id,
          judul: "Refleksi mahasiswa menunggu pemeriksaan",
          isi: "Mahasiswa telah mengirim refleksi tertulis. Tinjau dan setujui atau minta perbaikan.",
          tautanTab: dosenPaId ? "laporan-dpa" : "laporan",
        },
      });
      return true;
    });
    if (!submitted) {
      response.status(404).json({ message: "Tugas pembinaan tidak ditemukan atau tidak dapat dikirim." });
      return;
    }
    response.json({ message: "Refleksi berhasil dikirim." });
  } catch (error) {
    console.error("Gagal mengirim refleksi mahasiswa:", error);
    response.status(500).json({ message: "Refleksi gagal dikirim." });
  }
});

reportRouter.get("/mahasiswa/pemberitahuan", async (request, response) => {
  const session = requireStudent(request, response);
  if (!session) return;
  try {
    const pemberitahuan = await database.pemberitahuan.findMany({
      where: { studentId: session.profile.id },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { id: true, judul: true, isi: true, tautanTab: true, dibaca: true, createdAt: true },
    });
    response.json({ pemberitahuan });
  } catch (error) {
    console.error("Gagal memuat pemberitahuan mahasiswa:", error);
    response.status(500).json({ message: "Pemberitahuan gagal dimuat." });
  }
});

reportRouter.patch("/mahasiswa/pemberitahuan/:id/dibaca", async (request, response) => {
  const session = requireStudent(request, response);
  if (!session) return;
  const id = parsePositiveInteger(request.params.id);
  if (!id) {
    response.status(400).json({ message: "ID pemberitahuan tidak valid." });
    return;
  }
  try {
    const result = await database.pemberitahuan.updateMany({
      where: { id, studentId: session.profile.id },
      data: { dibaca: true },
    });
    if (result.count === 0) {
      response.status(404).json({ message: "Pemberitahuan tidak ditemukan." });
      return;
    }
    response.json({ message: "Pemberitahuan ditandai sudah dibaca." });
  } catch (error) {
    console.error("Gagal memperbarui status pemberitahuan:", error);
    response.status(500).json({ message: "Status pemberitahuan gagal diperbarui." });
  }
});

reportRouter.get("/dosen/pemberitahuan", async (request, response) => {
  const session = requireDosen(request, response);
  if (!session) return;
  try {
    const pemberitahuan = await database.pemberitahuanStaf.findMany({
      where: { peran: PeranPenerima.DOSEN, dosenId: session.profile.id },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        judul: true,
        isi: true,
        tautanTab: true,
        dibaca: true,
        createdAt: true,
        laporanId: true,
      },
    });
    response.json({ pemberitahuan });
  } catch (error) {
    console.error("Gagal memuat pemberitahuan dosen:", error);
    response.status(500).json({ message: "Pemberitahuan gagal dimuat." });
  }
});

reportRouter.patch("/dosen/pemberitahuan/:id/dibaca", async (request, response) => {
  const session = requireDosen(request, response);
  if (!session) return;
  const id = parsePositiveInteger(request.params.id);
  if (!id) {
    response.status(400).json({ message: "ID pemberitahuan tidak valid." });
    return;
  }
  try {
    const result = await database.pemberitahuanStaf.updateMany({
      where: { id, peran: PeranPenerima.DOSEN, dosenId: session.profile.id },
      data: { dibaca: true },
    });
    if (result.count === 0) {
      response.status(404).json({ message: "Pemberitahuan tidak ditemukan." });
      return;
    }
    response.json({ message: "Pemberitahuan ditandai sudah dibaca." });
  } catch (error) {
    console.error("Gagal memperbarui status pemberitahuan dosen:", error);
    response.status(500).json({ message: "Status pemberitahuan gagal diperbarui." });
  }
});

reportRouter.get("/admin/pemberitahuan", async (request, response) => {
  if (!requireAdmin(request, response)) return;
  try {
    const pemberitahuan = await database.pemberitahuanStaf.findMany({
      where: { peran: PeranPenerima.KEMAHASISWAAN },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        judul: true,
        isi: true,
        tautanTab: true,
        dibaca: true,
        createdAt: true,
        laporanId: true,
      },
    });
    response.json({ pemberitahuan });
  } catch (error) {
    console.error("Gagal memuat pemberitahuan kemahasiswaan:", error);
    response.status(500).json({ message: "Pemberitahuan gagal dimuat." });
  }
});

reportRouter.patch("/admin/pemberitahuan/:id/dibaca", async (request, response) => {
  if (!requireAdmin(request, response)) return;
  const id = parsePositiveInteger(request.params.id);
  if (!id) {
    response.status(400).json({ message: "ID pemberitahuan tidak valid." });
    return;
  }
  try {
    const result = await database.pemberitahuanStaf.updateMany({
      where: { id, peran: PeranPenerima.KEMAHASISWAAN },
      data: { dibaca: true },
    });
    if (result.count === 0) {
      response.status(404).json({ message: "Pemberitahuan tidak ditemukan." });
      return;
    }
    response.json({ message: "Pemberitahuan ditandai sudah dibaca." });
  } catch (error) {
    console.error("Gagal memperbarui status pemberitahuan kemahasiswaan:", error);
    response.status(500).json({ message: "Status pemberitahuan gagal diperbarui." });
  }
});

reportRouter.get("/dosen/laporan", async (request, response) => {
  const session = requireDosen(request, response);
  if (!session) return;
  try {
    const laporan = await database.laporan.findMany({
      where: {
        jenis: JenisLaporan.TEMUAN,
        status: StatusLaporan.DITERIMA,
        jalur: "TERIDENTIFIKASI",
        terlapor: { dosenPaId: session.profile.id },
      },
      orderBy: { id: "asc" },
      select: {
        id: true,
        pillar: true,
        severityUsulan: true,
        terlaporNama: true,
        terlaporNim: true,
        lokasi: true,
        tanggalKejadian: true,
        deskripsi: true,
        buktiPath: true,
        aturanId: true,
        terlapor: { select: { id: true, nim: true, nama: true, pointScore: true } },
      },
    });
    response.json({ laporan });
  } catch (error) {
    console.error("Gagal memuat antrean konfirmasi laporan Dosen PA:", error);
    response.status(500).json({ message: "Antrean konfirmasi laporan gagal dimuat." });
  }
});

reportRouter.patch("/dosen/laporan/:id/konfirmasi", async (request, response) => {
  const session = requireDosen(request, response);
  if (!session) return;
  const id = parsePositiveInteger(request.params.id);
  const keputusan = request.body?.keputusan;
  const aturanId = parsePositiveInteger(String(request.body?.aturanId ?? ""));
  const catatan =
    typeof request.body?.catatan === "string" ? request.body.catatan.trim() : "";
  if (
    !id ||
    !["KONFIRMASI", "DITOLAK"].includes(keputusan) ||
    catatan.length > 1000 ||
    (keputusan === "KONFIRMASI" && !aturanId)
  ) {
    response.status(400).json({ message: "Keputusan atau aturan pelanggaran tidak valid." });
    return;
  }
  try {
    const result = await database.$transaction(
      async (transaction) => {
        const report = await transaction.laporan.findFirst({
          where: {
            id,
            status: StatusLaporan.DITERIMA,
            jenis: JenisLaporan.TEMUAN,
            terlapor: { dosenPaId: session.profile.id },
          },
          include: { terlapor: true },
        });
        if (!report?.terlapor) return { kind: "not_assigned" as const };

        if (keputusan === "DITOLAK") {
          await transaction.laporan.update({
            where: { id },
            data: {
              status: StatusLaporan.DITOLAK,
              dikonfirmasiDosenId: session.profile.id,
              tanggalKonfirmasiDosen: new Date(),
              catatanUntukPelapor: catatan || null,
            },
          });
          await transaction.pemberitahuan.create({
            data: {
              studentId: report.terlaporId!,
              judul: "Laporan tidak dikonfirmasi Dosen PA",
              isi: catatan || "Dosen PA telah meninjau laporan dan tidak mengonfirmasi pelanggaran.",
              tautanTab: "tindak-lanjut",
            },
          });
          await transaction.pemberitahuanStaf.create({
            data: {
              peran: PeranPenerima.KEMAHASISWAAN,
              laporanId: id,
              judul: "Laporan ditolak Dosen PA",
              isi: `Dosen PA tidak mengonfirmasi laporan #${id}.${catatan ? ` Catatan: ${catatan}` : ""}`,
              tautanTab: "laporan",
            },
          });
          await writeAudit(transaction, session, "LAPORAN_DITOLAK_DPA", "Laporan", id);
          return { kind: "decided" as const, status: StatusLaporan.DITOLAK };
        }

        const rule = await transaction.aturanPelanggaran.findFirst({
          where: { id: aturanId!, pillar: report.pillar, aktif: true },
        });
        if (!rule || rule.bobotPoin <= 0) return { kind: "invalid_rule" as const };

        const pointChange = calculatePointChangeForDelta(
          report.terlapor.pointScore,
          -rule.bobotPoin,
        );
        const savedChange = await transaction.pointChange.create({
          data: {
            studentId: report.terlapor.id,
            type: "REPORTED_VIOLATION" as PointChangeType,
            pillar: rule.pillar,
            severity: rule.severity,
            delta: pointChange.delta,
            scoreAfter: pointChange.score,
            reason: `Pelanggaran dikonfirmasi Dosen PA: ${rule.nama}`,
            recordedByIdentity: session.profile.identity,
          },
          select: { id: true },
        });
        await transaction.mahasiswa.update({
          where: { id: report.terlapor.id },
          data: { pointScore: pointChange.score },
        });
        await transaction.laporan.update({
          where: { id },
          data: {
            status: StatusLaporan.DIVERIFIKASI,
            aturanId: rule.id,
            severityUsulan: rule.severity,
            perubahanPoinId: savedChange.id,
            dikonfirmasiDosenId: session.profile.id,
            tanggalKonfirmasiDosen: new Date(),
            catatanUntukPelapor: catatan || null,
          },
        });
        await transaction.pemberitahuan.create({
          data: {
            studentId: report.terlapor.id,
            judul: "Pelanggaran dikonfirmasi Dosen PA",
            isi: `Dosen PA mengonfirmasi pelanggaran "${rule.nama}". Poin berkurang ${Math.abs(pointChange.delta)}. Kemahasiswaan akan menetapkan tindak lanjut edukatif.`,
            tautanTab: "tindak-lanjut",
          },
        });
        await transaction.pemberitahuanStaf.create({
          data: {
            peran: PeranPenerima.KEMAHASISWAAN,
            laporanId: id,
            judul: "Laporan terkonfirmasi, perlu tindak lanjut",
            isi: `Dosen PA telah mengonfirmasi pelanggaran mahasiswa ${report.terlapor.nama} (NIM ${report.terlapor.nim}). Tetapkan tugas edukatif atau coaching.`,
            tautanTab: "laporan",
          },
        });
        await writeAudit(transaction, session, "LAPORAN_DIKONFIRMASI_DPA", "Laporan", id);
        return {
          kind: "decided" as const,
          status: StatusLaporan.DIVERIFIKASI,
          delta: pointChange.delta,
          emailNotification: report.terlapor.email
            ? {
                toEmail: report.terlapor.email,
                studentName: report.terlapor.nama,
                studentNim: report.terlapor.nim,
                prodi: report.terlapor.jurusan,
                pillarName: disciplinePillarLabels[rule.pillar] || rule.pillar,
                severityName: violationSeverityLabels[rule.severity] || rule.severity,
                delta: pointChange.delta,
                scoreAfter: pointChange.score,
                reason: `Pelanggaran dikonfirmasi Dosen PA: ${rule.nama}`,
                category: "Pelanggaran Disiplin",
              }
            : null,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    if (result.kind === "not_assigned") {
      response.status(404).json({ message: "Laporan tidak ditemukan, sudah diproses, atau bukan mahasiswa bimbingan Anda." });
      return;
    }
    if (result.kind === "invalid_rule") {
      response.status(400).json({ message: "Aturan tidak aktif atau tidak sesuai dengan pilar laporan." });
      return;
    }
    const { emailNotification, ...decision } = "emailNotification" in result
      ? result
      : { ...result, emailNotification: null };
    if (emailNotification) {
      sendPointDeductionEmail(emailNotification).catch((err) => {
        console.error(`[Mailer] Error saat mengirim email ke ${emailNotification.toEmail}:`, err);
      });
    }
    response.json(decision);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      response.status(409).json({ message: "Laporan sedang diproses. Muat ulang antrean dan coba lagi." });
      return;
    }
    console.error("Gagal menyimpan konfirmasi Dosen PA:", error);
    response.status(500).json({ message: "Konfirmasi laporan gagal disimpan." });
  }
});

reportRouter.get("/dosen/pembinaan", async (request, response) => {
  const session = requireDosen(request, response);
  if (!session) return;
  try {
    const pembinaan = await database.pembinaan.findMany({
      where: {
        status: StatusPembinaan.DIKIRIM,
        buktiUrl: { not: null },
        student: { dosenPaId: session.profile.id },
        perubahanPoin: { is: { type: "REPORTED_VIOLATION" } },
      },
      orderBy: { updatedAt: "asc" },
      select: {
        id: true,
        jenis: true,
        instruksi: true,
        status: true,
        isiRefleksi: true,
        buktiUrl: true,
        updatedAt: true,
        student: { select: { nama: true, nim: true } },
        perubahanPoin: {
          select: {
            id: true,
            reason: true,
            laporan: { select: { id: true, pillar: true } },
          },
        },
      },
    });
    response.json({ pembinaan });
  } catch (error) {
    console.error("Gagal memuat bukti tindak lanjut untuk Dosen PA:", error);
    response.status(500).json({ message: "Bukti tindak lanjut gagal dimuat." });
  }
});

reportRouter.patch("/dosen/pembinaan/:id", async (request, response) => {
  const session = requireDosen(request, response);
  if (!session) return;
  const id = parsePositiveInteger(request.params.id);
  const keputusan = request.body?.keputusan;
  const catatan =
    typeof request.body?.catatanPemeriksa === "string"
      ? request.body.catatanPemeriksa.trim()
      : "";
  if (!id || !["DISETUJUI", "DITOLAK"].includes(keputusan) || catatan.length > 1000) {
    response.status(400).json({ message: "Putusan bukti tindak lanjut tidak valid." });
    return;
  }
  try {
    const result = await database.$transaction(
      async (transaction) => {
        const training = await transaction.pembinaan.findFirst({
          where: {
            id,
            status: StatusPembinaan.DIKIRIM,
            buktiUrl: { not: null },
            student: { dosenPaId: session.profile.id },
            perubahanPoin: { is: { type: "REPORTED_VIOLATION" } },
          },
          include: {
            perubahanPoin: {
              include: { laporan: true },
            },
          },
        });
        if (!training) return null;
        const updatedCount = await transaction.pembinaan.updateMany({
          where: { id, status: StatusPembinaan.DIKIRIM },
          data: {
            status: keputusan as StatusPembinaan,
            catatanPemeriksa: catatan || null,
          },
        });
        if (updatedCount.count === 0) return null;

        let restoredPoints = 0;
        if (keputusan === "DISETUJUI") {
          const student = await transaction.mahasiswa.findUniqueOrThrow({
            where: { id: training.studentId },
            select: { pointScore: true },
          });
          const restored = calculatePointChangeForDelta(
            student.pointScore,
            Math.abs(training.perubahanPoin.delta),
          );
          restoredPoints = Math.abs(restored.delta);
          await transaction.mahasiswa.update({
            where: { id: training.studentId },
            data: { pointScore: restored.score },
          });
          await transaction.pointChange.create({
            data: {
              studentId: training.studentId,
              type: "POINT_RESTORATION",
              pillar: training.perubahanPoin.pillar,
              severity: training.perubahanPoin.severity,
              delta: restored.delta,
              scoreAfter: restored.score,
              reason: `Pemulihan poin setelah bukti tindak lanjut laporan #${training.perubahanPoin.laporan?.id ?? training.id} disetujui Dosen PA`,
              recordedByIdentity: session.profile.identity,
            },
          });
          if (training.perubahanPoin.laporan) {
            await transaction.laporan.update({
              where: { id: training.perubahanPoin.laporan.id },
              data: { status: StatusLaporan.SELESAI },
            });
            await transaction.pemberitahuanStaf.create({
              data: {
                peran: PeranPenerima.KEMAHASISWAAN,
                laporanId: training.perubahanPoin.laporan.id,
                judul: "Tindak lanjut laporan selesai",
                isi: `Dosen PA menyetujui bukti tindak lanjut. ${restoredPoints} poin dipulihkan; riwayat pelanggaran tetap tercatat.`,
                tautanTab: "laporan",
              },
            });
          }
        }

        await transaction.pemberitahuan.create({
          data: {
            studentId: training.studentId,
            judul: keputusan === "DISETUJUI"
              ? "Bukti tindak lanjut disetujui"
              : "Bukti tindak lanjut perlu diperbaiki",
            isi: keputusan === "DISETUJUI"
              ? `Dosen PA menyetujui bukti tindak lanjut. ${restoredPoints} poin telah dipulihkan.${catatan ? ` Catatan: ${catatan}` : ""}`
              : catatan || "Silakan perbaiki dan kirim kembali bukti tindak lanjut.",
            tautanTab: "tindak-lanjut",
          },
        });
        await writeAudit(transaction, session, `BUKTI_TINDAK_LANJUT_${keputusan}`, "Pembinaan", id);
        return { id, status: keputusan };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    if (!result) {
      response.status(404).json({ message: "Bukti tidak ditemukan, bukan mahasiswa bimbingan Anda, atau sudah diputuskan." });
      return;
    }
    response.json({ pembinaan: result });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      response.status(409).json({ message: "Bukti sedang diproses. Muat ulang antrean dan coba lagi." });
      return;
    }
    console.error("Gagal memutuskan bukti tindak lanjut:", error);
    response.status(500).json({ message: "Putusan bukti tindak lanjut gagal disimpan." });
  }
});

reportRouter.get("/admin/laporan", async (request, response) => {
  if (!requireAdmin(request, response)) return;
  const status = request.query.status;
  const pillar = request.query.pillar;
  const cursor =
    request.query.cursor === undefined ? null : parsePositiveInteger(request.query.cursor);
  const limit =
    request.query.limit === undefined ? 50 : parsePositiveInteger(request.query.limit);
  if (
    (status !== undefined &&
      (typeof status !== "string" ||
        !Object.values(StatusLaporan).includes(status as StatusLaporan))) ||
    (pillar !== undefined &&
      (typeof pillar !== "string" ||
        !pillarValues.includes(pillar as DisciplinePillar))) ||
    (request.query.cursor !== undefined && cursor === null) ||
    limit === null ||
    limit > 100
  ) {
    response.status(400).json({ message: "Filter laporan tidak valid." });
    return;
  }
  const where: Prisma.LaporanWhereInput = {
    ...(status ? { status: status as StatusLaporan } : {}),
    ...(pillar ? { pillar: pillar as DisciplinePillar } : {}),
  };
  try {
    const [pendingCount, laporan] = await Promise.all([
      database.laporan.count({
        where: {
          ...(pillar ? { pillar: pillar as DisciplinePillar } : {}),
          status: { in: [StatusLaporan.DITERIMA, StatusLaporan.DIVERIFIKASI] },
        },
      }),
      database.laporan.findMany({
      where,
      // Enum Postgres terurut sesuai deklarasi: laporan yang menunggu tampil dulu.
      orderBy: [{ status: "asc" }, { id: "asc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        jenis: true,
        pillar: true,
        aturanId: true,
        severityUsulan: true,
        terlaporNama: true,
        terlaporNim: true,
        jalur: true,
        terlaporKeterangan: true,
        lokasi: true,
        tanggalKejadian: true,
        tanggalLapor: true,
        deskripsi: true,
        buktiPath: true,
        status: true,
        catatanUntukPelapor: true,
        tanggalKonfirmasiDosen: true,
        terlapor: { select: { id: true, nim: true, nama: true } },
        aturan: { select: { nama: true, severity: true, bobotPoin: true } },
        dikonfirmasiDosen: { select: { nama: true } },
        perubahanPoin: {
          select: {
            delta: true,
            pembinaans: {
              select: {
                id: true,
                jenis: true,
                instruksi: true,
                status: true,
                buktiUrl: true,
                isiRefleksi: true,
                catatanPemeriksa: true,
              },
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
      },
      }),
    ]);
    const hasMore = laporan.length > limit;
    const page = hasMore ? laporan.slice(0, limit) : laporan;
    response.json({
      laporan: page,
      pendingCount,
      nextCursor: hasMore ? page[page.length - 1].id : null,
    });
  } catch (error) {
    console.error("Gagal memuat antrean laporan:", error);
    response.status(500).json({ message: "Antrean laporan gagal dimuat." });
  }
});

reportRouter.patch("/admin/laporan/:id/rute", async (request, response) => {
  const session = requireAdmin(request, response);
  if (!session) return;
  const id = parsePositiveInteger(request.params.id);
  const nim = parsePositiveInteger(
    typeof request.body?.nim === "string" ? request.body.nim.trim() : "",
  );
  if (!id || !nim) {
    response.status(400).json({ message: "ID laporan dan NIM mahasiswa tidak valid." });
    return;
  }
  try {
    const result = await database.$transaction(async (transaction) => {
      const report = await transaction.laporan.findUnique({ where: { id } });
      if (
        !report ||
        report.status !== StatusLaporan.DITERIMA ||
        report.jalur === "TERIDENTIFIKASI"
      ) {
        return { kind: "not_pending" as const };
      }
      const student = await transaction.mahasiswa.findUnique({
        where: { nim },
        select: { id: true, nama: true, nim: true, dosenPaId: true },
      });
      if (!student) return { kind: "student_not_found" as const };

      await transaction.laporan.update({
        where: { id },
        data: {
          terlaporId: student.id,
          terlaporNama: student.nama,
          terlaporNim: String(student.nim),
          jalur: "TERIDENTIFIKASI",
        },
      });
      const route = { jalur: "TERIDENTIFIKASI" as const, student };
      const texts = buildReportNotificationTexts({
        jenis: report.jenis,
        pillar: report.pillar,
        tanggalKejadian: report.tanggalKejadian,
        route,
        terlaporNama: student.nama,
        terlaporNim: String(student.nim),
      });
      await createReportNotifications(transaction, {
        laporanId: id,
        route,
        texts,
        notifyKemahasiswaan: false,
      });
      const adminNotice = await transaction.pemberitahuanStaf.updateMany({
        where: { peran: PeranPenerima.KEMAHASISWAAN, laporanId: id },
        data: {
          judul: "Laporan berhasil ditelusuri",
          isi: student.dosenPaId
            ? `Laporan #${id} diteruskan kepada mahasiswa ${student.nama} dan Dosen PA untuk konfirmasi. Poin belum berubah.`
            : `Laporan #${id} diteruskan kepada mahasiswa ${student.nama}, tetapi Dosen PA belum ditetapkan. Poin belum berubah.`,
          tautanTab: "laporan",
        },
      });
      if (adminNotice.count === 0) {
        await transaction.pemberitahuanStaf.create({
          data: {
            peran: PeranPenerima.KEMAHASISWAAN,
            laporanId: id,
            judul: "Laporan berhasil ditelusuri",
            isi: student.dosenPaId
              ? `Laporan #${id} diteruskan kepada mahasiswa ${student.nama} dan Dosen PA untuk konfirmasi. Poin belum berubah.`
              : `Laporan #${id} diteruskan kepada mahasiswa ${student.nama}, tetapi Dosen PA belum ditetapkan. Poin belum berubah.`,
            tautanTab: "laporan",
          },
        });
      }
      await writeAudit(transaction, session, "LAPORAN_DIRUTEKAN", "Laporan", id);
      return { kind: "routed" as const, dosenPaId: student.dosenPaId };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if (result.kind === "not_pending") {
      response.status(409).json({ message: "Laporan tidak lagi menunggu penelusuran." });
      return;
    }
    if (result.kind === "student_not_found") {
      response.status(404).json({ message: "Mahasiswa dengan NIM tersebut tidak ditemukan." });
      return;
    }
    response.json({
      message: result.dosenPaId
        ? "Laporan diteruskan kepada mahasiswa dan Dosen PA untuk konfirmasi."
        : "Laporan diteruskan kepada mahasiswa. Mahasiswa ini belum memiliki Dosen PA.",
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      response.status(409).json({ message: "Laporan sedang diproses. Muat ulang antrean dan coba lagi." });
      return;
    }
    console.error("Gagal merutekan laporan ke mahasiswa:", error);
    response.status(500).json({ message: "Laporan gagal diteruskan." });
  }
});

reportRouter.patch("/admin/laporan/:id/tindak-lanjut", async (request, response) => {
  const session = requireAdmin(request, response);
  if (!session) return;
  const id = parsePositiveInteger(request.params.id);
  const jenis = request.body?.jenis;
  const instruksi =
    typeof request.body?.instruksi === "string" ? request.body.instruksi.trim() : "";
  if (
    !id ||
    !Object.values(JenisPembinaan).includes(jenis) ||
    instruksi.length < 10 ||
    instruksi.length > 2000
  ) {
    response.status(400).json({ message: "Jenis dan instruksi tindak lanjut wajib diisi (10–2000 karakter)." });
    return;
  }
  try {
    const result = await database.$transaction(async (transaction) => {
      const report = await transaction.laporan.findUnique({
        where: { id },
        include: { perubahanPoin: true, terlapor: true },
      });
      if (
        !report ||
        report.jenis !== JenisLaporan.TEMUAN ||
        report.status !== StatusLaporan.DIVERIFIKASI ||
        !report.perubahanPoin ||
        !report.terlapor
      ) {
        return null;
      }
      const existingTraining = await transaction.pembinaan.findFirst({
        where: { perubahanPoinId: report.perubahanPoin.id },
        select: { id: true },
      });
      if (existingTraining) return null;

      const training = await transaction.pembinaan.create({
        data: {
          perubahanPoinId: report.perubahanPoin.id,
          studentId: report.terlapor.id,
          jenis,
          instruksi,
        },
        select: { id: true },
      });
      await transaction.laporan.update({
        where: { id },
        data: { status: StatusLaporan.DITINDAKLANJUTI },
      });
      await transaction.pemberitahuan.create({
        data: {
          studentId: report.terlapor.id,
          judul: "Tindak lanjut edukatif telah ditetapkan",
          isi: instruksi,
          tautanTab: "tindak-lanjut",
        },
      });
      await writeAudit(transaction, session, "TINDAK_LANJUT_DITETAPKAN", "Laporan", id);
      return training;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if (!result) {
      response.status(409).json({ message: "Laporan belum dikonfirmasi Dosen PA atau tindak lanjut sudah ditetapkan." });
      return;
    }
    response.status(201).json({ pembinaan: result });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      response.status(409).json({ message: "Laporan sedang diproses. Muat ulang antrean dan coba lagi." });
      return;
    }
    console.error("Gagal menetapkan tindak lanjut laporan:", error);
    response.status(500).json({ message: "Tindak lanjut gagal ditetapkan." });
  }
});

reportRouter.patch("/admin/laporan/:id/verifikasi", async (request, response) => {
  const session = requireAdmin(request, response);
  if (!session) return;
  const id = parsePositiveInteger(request.params.id);
  const keputusan = request.body?.keputusan;
  const aturanId = request.body?.aturanId
    ? Number(request.body.aturanId)
    : null;
  const nim =
    typeof request.body?.nim === "string" ? request.body.nim.trim() : "";
  const catatanUntukPelapor =
    typeof request.body?.catatanUntukPelapor === "string"
      ? request.body.catatanUntukPelapor.trim()
      : "";
  if (
    !id ||
    !reportDecisions.includes(keputusan) ||
    (aturanId !== null && (!Number.isSafeInteger(aturanId) || aturanId < 1)) ||
    catatanUntukPelapor.length > 1000
  ) {
    response.status(400).json({ message: "Keputusan verifikasi tidak valid." });
    return;
  }
  const parsedNim = parsePositiveInteger(nim);
  if (keputusan === "DIVERIFIKASI" && !parsedNim) {
    response.status(400).json({ message: "NIM hasil pencocokan wajib diisi untuk verifikasi." });
    return;
  }
  try {
    const result = await database.$transaction(
      async (transaction) => {
        const report = await transaction.laporan.findUnique({ where: { id } });
        if (!report || report.status !== StatusLaporan.DITERIMA) {
          return { kind: "not_pending" as const };
        }
        if (
          report.jenis === JenisLaporan.TEMUAN &&
          (keputusan === "DIVERIFIKASI" || report.jalur === "TERIDENTIFIKASI")
        ) {
          return { kind: "dpa_confirmation_required" as const };
        }
        if (keputusan === "DITOLAK") {
          const updated = await transaction.laporan.update({
            where: { id },
            data: {
              status: StatusLaporan.DITOLAK,
              tanggalVerifikasi: new Date(),
              catatanUntukPelapor: catatanUntukPelapor || null,
            },
            select: { id: true },
          });
          await writeAudit(transaction, session, "LAPORAN_DITOLAK", "Laporan", updated.id);
          return { kind: "decided" as const, status: StatusLaporan.DITOLAK };
        }

        const student = await transaction.mahasiswa.findUnique({
          where: { nim: parsedNim! },
          select: { id: true, nim: true, pointScore: true, nama: true, email: true, jurusan: true },
        });
        if (!student) return { kind: "student_not_found" as const };

        let pointChangeId: number | null = null;
        let needsTraining = false;
        let emailNotification: {
          toEmail: string;
          studentName: string;
          studentNim: number;
          prodi: string;
          pillarName: string;
          severityName: string;
          delta: number;
          scoreAfter: number;
          reason: string;
          category: string;
        } | null = null;
        if (report.jenis === JenisLaporan.TEMUAN) {
          if (!aturanId) return { kind: "rule_required" as const };
          const rule = await transaction.aturanPelanggaran.findFirst({
            where: { id: aturanId, pillar: report.pillar, aktif: true },
          });
          if (!rule || rule.bobotPoin <= 0) return { kind: "invalid_rule" as const };

          const pointChange = calculatePointChangeForDelta(
            student.pointScore,
            -rule.bobotPoin,
          );
          const metadata = getPointChangeMetadata("REPORTED_VIOLATION", {
            pillar: rule.pillar,
            severity: rule.severity,
          });
          await transaction.mahasiswa.update({
            where: { id: student.id },
            data: { pointScore: pointChange.score },
          });
          const savedChange = await transaction.pointChange.create({
            data: {
              studentId: student.id,
              type: "REPORTED_VIOLATION" as PointChangeType,
              pillar: metadata.pillar,
              severity: metadata.severity,
              delta: pointChange.delta,
              scoreAfter: pointChange.score,
              reason: `Laporan terverifikasi: ${rule.nama}`,
              recordedByIdentity: session.profile.identity,
            },
            select: { id: true },
          });
          pointChangeId = savedChange.id;
          needsTraining = ["SEDANG", "BERAT", "SANGAT_BERAT"].includes(rule.severity);
          if (student.email) {
            emailNotification = {
              toEmail: student.email,
              studentName: student.nama,
              studentNim: student.nim,
              prodi: student.jurusan,
              pillarName: disciplinePillarLabels[report.pillar] || report.pillar,
              severityName: violationSeverityLabels[rule.severity] || rule.severity,
              delta: pointChange.delta,
              scoreAfter: pointChange.score,
              reason: `Laporan terverifikasi: ${rule.nama}`,
              category: "Pelanggaran Disiplin",
            };
          }

          if (needsTraining) {
            await transaction.pembinaan.create({
              data: {
                perubahanPoinId: savedChange.id,
                studentId: student.id,
                jenis: JenisPembinaan.REFLEKSI_TERTULIS,
                instruksi: violationSeverityFollowUps[rule.severity],
              },
            });
          }

          await transaction.pemberitahuan.create({
            data: {
              studentId: student.id,
              judul: "Laporan pelanggaran telah diverifikasi",
              isi: `Perubahan poin Anda telah dicatat pada pilar ${report.pillar}. Silakan tinjau tindak lanjut dan pembinaan.`,
              tautanTab: "tindak-lanjut",
            },
          });
        } else {
          await transaction.pemberitahuan.create({
            data: {
              studentId: student.id,
              judul: "Laporan apresiasi telah diverifikasi",
              isi: "Laporan apresiasi perilaku positif untuk Anda telah diverifikasi.",
              tautanTab: "dashboard",
            },
          });
        }

        const updated = await transaction.laporan.update({
          where: { id },
          data: {
            status: needsTraining
              ? StatusLaporan.DITINDAKLANJUTI
              : StatusLaporan.DIVERIFIKASI,
            terlaporNim: String(student.nim),
            aturanId: report.jenis === JenisLaporan.TEMUAN ? aturanId : report.aturanId,
            severityUsulan:
              report.jenis === JenisLaporan.TEMUAN
                ? (await transaction.aturanPelanggaran.findUniqueOrThrow({
                    where: { id: aturanId! },
                    select: { severity: true },
                  })).severity
                : report.severityUsulan,
            tanggalVerifikasi: new Date(),
            catatanUntukPelapor: catatanUntukPelapor || null,
            perubahanPoinId: pointChangeId,
          },
          select: { id: true },
        });
        await writeAudit(transaction, session, "LAPORAN_DIVERIFIKASI", "Laporan", updated.id);
        return {
          kind: "decided" as const,
          status: needsTraining
            ? StatusLaporan.DITINDAKLANJUTI
            : StatusLaporan.DIVERIFIKASI,
          pointChangeId,
          emailNotification,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    if (result.kind === "not_pending") {
      response.status(404).json({ message: "Laporan tidak ditemukan atau sudah diproses." });
      return;
    }
    if (result.kind === "student_not_found") {
      response.status(404).json({ message: "Mahasiswa hasil pencocokan tidak ditemukan." });
      return;
    }
    if (result.kind === "dpa_confirmation_required") {
      response.status(409).json({
        message: "Temuan harus dikonfirmasi Dosen PA sebelum Kemahasiswaan menetapkan tindak lanjut.",
      });
      return;
    }
    if (result.kind === "rule_required") {
      response.status(400).json({ message: "Pilih aturan pelanggaran untuk memverifikasi temuan." });
      return;
    }
    if (result.kind === "invalid_rule") {
      response.status(400).json({ message: "Aturan tidak aktif atau tidak sesuai dengan pilar laporan." });
      return;
    }
    if ("emailNotification" in result && result.emailNotification?.toEmail) {
      sendPointDeductionEmail(result.emailNotification).catch((err) => {
        console.error("[Mailer] Gagal mengirim email notifikasi pelanggaran:", err);
      });
    }
    response.json(result);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      response.status(409).json({ message: "Laporan sedang diproses. Muat ulang antrean dan coba lagi." });
      return;
    }
    console.error("Gagal memverifikasi laporan:", error);
    response.status(500).json({ message: "Verifikasi laporan gagal disimpan." });
  }
});

reportRouter.patch("/admin/sanggahan/:id", (request, response) =>
  decideAppeal(request, response, requireAdmin(request, response)),
);

// Dosen PA hanya boleh memutus sanggahan mahasiswa bimbingannya sendiri.
reportRouter.patch("/dosen/sanggahan/:id", (request, response) =>
  decideAppeal(request, response, requireDosen(request, response)),
);

async function decideAppeal(
  request: Request,
  response: Response,
  session: Session | null,
): Promise<void> {
  if (!session) return;
  const id = parsePositiveInteger(request.params.id);
  const decision = request.body?.keputusan;
  const note =
    typeof request.body?.catatanPemeriksa === "string"
      ? request.body.catatanPemeriksa.trim()
      : "";
  if (!id || !["DISETUJUI", "DITOLAK"].includes(decision) || note.length > 1000) {
    response.status(400).json({ message: "Putusan sanggahan tidak valid." });
    return;
  }
  try {
    const result = await database.$transaction(
      async (transaction) => {
        const appeal = await transaction.sanggahan.findFirst({
          where: {
            id,
            status: StatusSanggahan.DIAJUKAN,
            ...(session.profile.role === "dosen"
              ? { student: { dosenPaId: session.profile.id } }
              : {}),
          },
          include: { perubahanPoin: true },
        });
        if (!appeal) {
          return null;
        }
        const examiner = session.profile.role === "dosen" ? "Dosen PA" : "Kemahasiswaan";
        const updated = await transaction.sanggahan.update({
          where: { id },
          data: {
            status: decision as StatusSanggahan,
            catatanPemeriksa: note || null,
            reviewedAt: new Date(),
          },
          select: { id: true, studentId: true, status: true },
        });
        if (decision === "DISETUJUI") {
          const student = await transaction.mahasiswa.findUniqueOrThrow({
            where: { id: appeal.studentId },
            select: { pointScore: true },
          });
          const restored = calculatePointChangeForDelta(
            student.pointScore,
            Math.abs(appeal.perubahanPoin.delta),
          );
          await transaction.mahasiswa.update({
            where: { id: appeal.studentId },
            data: { pointScore: restored.score },
          });
          await transaction.pointChange.create({
            data: {
              studentId: appeal.studentId,
              type: "POINT_RESTORATION",
              pillar: null,
              severity: null,
              delta: restored.delta,
              scoreAfter: restored.score,
              reason: `Pemulihan poin dari sanggahan #${appeal.id}`,
              recordedByIdentity: session.profile.identity,
            },
          });
        }
        await transaction.pemberitahuan.create({
          data: {
            studentId: appeal.studentId,
            judul: decision === "DISETUJUI" ? "Sanggahan Anda disetujui" : "Sanggahan Anda ditolak",
            isi: decision === "DISETUJUI"
              ? `${examiner} menyetujui sanggahan Anda. Poin telah dipulihkan.${note ? ` Catatan: ${note}` : ""}`
              : `${examiner} menolak sanggahan Anda.${note ? ` Catatan: ${note}` : ""}`,
            tautanTab: "sanggah",
          },
        });
        await writeAudit(transaction, session, `SANGGAHAN_${decision}`, "Sanggahan", updated.id);
        return updated;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    if (!result) {
      response.status(404).json({ message: "Sanggahan tidak ditemukan, bukan mahasiswa bimbingan Anda, atau sudah diputuskan." });
      return;
    }
    response.json({ sanggahan: result });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      response.status(409).json({ message: "Sanggahan sedang diproses. Muat ulang dan coba lagi." });
      return;
    }
    console.error("Gagal memutuskan sanggahan:", error);
    response.status(500).json({ message: "Putusan sanggahan gagal disimpan." });
  }
}

reportRouter.patch("/admin/pembinaan/:id", async (request, response) => {
  const session = requireAdmin(request, response);
  if (!session) return;
  const id = parsePositiveInteger(request.params.id);
  const decision = request.body?.keputusan;
  const note =
    typeof request.body?.catatanPemeriksa === "string"
      ? request.body.catatanPemeriksa.trim()
      : "";
  if (!id || !["DISETUJUI", "DITOLAK"].includes(decision) || note.length > 1000) {
    response.status(400).json({ message: "Putusan pembinaan tidak valid." });
    return;
  }
  try {
    const result = await database.$transaction(async (transaction) => {
      const training = await transaction.pembinaan.findUnique({
        where: { id },
        include: { perubahanPoin: { select: { type: true } } },
      });
      if (
        training?.perubahanPoin.type === "REPORTED_VIOLATION" &&
        training.status === StatusPembinaan.DIKIRIM
      ) {
        return { kind: "dpa_required" as const };
      }
      const updatedCount = await transaction.pembinaan.updateMany({
        where: { id, status: StatusPembinaan.DIKIRIM },
        data: {
          status: decision as StatusPembinaan,
          catatanPemeriksa: note || null,
        },
      });
      if (updatedCount.count === 0) return { kind: "not_pending" as const };
      const pembinaan = await transaction.pembinaan.findUniqueOrThrow({
        where: { id },
        select: { id: true },
      });
      await writeAudit(transaction, session, `PEMBINAAN_${decision}`, "Pembinaan", id);
      return { kind: "decided" as const, pembinaan };
    });
    if (result.kind === "dpa_required") {
      response.status(403).json({
        message: "Bukti tindak lanjut laporan hanya dapat disetujui Dosen PA mahasiswa.",
      });
      return;
    }
    if (result.kind === "not_pending") {
      response.status(404).json({ message: "Pembinaan tidak ditemukan atau belum dikirim untuk diperiksa." });
      return;
    }
    response.json({ pembinaan: result.pembinaan });
  } catch (error) {
    console.error("Gagal memutuskan pembinaan:", error);
    response.status(500).json({ message: "Putusan pembinaan gagal disimpan." });
  }
});

// Bukti foto hanya untuk admin dan Dosen PA mahasiswa terlapor.
const evidenceRouter = Router();
evidenceRouter.get("/:fileName", async (request, response) => {
  const session = requireLogin(request, response);
  if (!session) return;
  const fileName = String(request.params.fileName);
  if (!/^[a-f0-9]{36}\.(jpg|png)$/.test(fileName)) {
    response.status(404).json({ message: "Bukti tidak ditemukan." });
    return;
  }
  const { role, id } = session.profile;
  if (role !== "admin" && role !== "dosen") {
    response.status(403).json({ message: "Anda tidak berhak melihat bukti ini." });
    return;
  }
  try {
    const report = await database.laporan.findFirst({
      where: {
        buktiPath: `/uploads/evidence/${fileName}`,
        ...(role === "dosen" ? { terlapor: { dosenPaId: id } } : {}),
      },
      select: { id: true },
    });
    if (!report) {
      response.status(404).json({ message: "Bukti tidak ditemukan." });
      return;
    }
    response.setHeader("Cache-Control", "private, no-store");
    response.sendFile(resolve(evidenceDirectory, fileName), (error) => {
      if (error && !response.headersSent) {
        response.status(404).json({ message: "Bukti tidak ditemukan." });
      }
    });
  } catch (error) {
    console.error("Gagal memuat bukti laporan:", error);
    response.status(500).json({ message: "Bukti gagal dimuat." });
  }
});

export { reportRouter, evidenceRouter };
