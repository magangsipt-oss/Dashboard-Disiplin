import { Router, type Request, type Response } from "express";
import { Prisma, type StatusPoin } from "@prisma/client";
import { currentSession, database, requireRole, type Session } from "../auth";
import { disciplinePillarLabels, violationSeverityLabels } from "../points";
import {
  countViolations,
  getPointSettings,
  getStudentPointStatuses,
  scoreRangeForStatus,
  violationLedgerTypes,
  type PointSettings,
} from "../point-ledger";
import { listViolationsWithResolution, unresolvedViolationStatuses } from "../punishment";
import {
  buildStudentExportCsv,
  buildStudentExportWorkbook,
  exportContentType,
  exportFileName,
  type ExportFormat,
} from "../student-export";
import {
  parseBody,
  violationLevelUpdateSchema,
  violationRuleCreateSchema,
  violationRuleUpdateSchema,
} from "../validation";

// Menu Kemahasiswaan: Data Poin Mahasiswa dan Pengaturan Pengurangan Poin.
// Semua route hanya untuk peran admin (Kemahasiswaan), dicek di server.
export const kemahasiswaanRouter = Router();
kemahasiswaanRouter.use(
  "/admin/poin",
  requireRole(["admin"], "Menu poin hanya tersedia untuk Kemahasiswaan."),
);

const statusCodes: StatusPoin[] = ["SANGAT_BAIK", "BAIK", "PERLU_PEMBINAAN", "TINDAK_LANJUT_KHUSUS"];
const pageSizes = [10, 20, 50, 100];
const sortOrders = {
  poin_asc: [{ pointScore: "asc" }, { nama: "asc" }],
  poin_desc: [{ pointScore: "desc" }, { nama: "asc" }],
  nama: [{ nama: "asc" }],
  nim: [{ nim: "asc" }],
} satisfies Record<string, Prisma.MahasiswaOrderByWithRelationInput[]>;
type SortOrder = keyof typeof sortOrders;

function queryString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function queryInteger(value: unknown): number | null {
  const text = queryString(value);
  return /^\d{1,9}$/.test(text) ? Number(text) : null;
}

function writeSettingsAudit(
  transaction: Prisma.TransactionClient,
  session: Session,
  entry: {
    aksi: string;
    entitas: string;
    entitasId: number;
    nilaiLama: Prisma.InputJsonValue | null;
    nilaiBaru: Prisma.InputJsonValue;
    alasan: string;
  },
) {
  return transaction.logAudit.create({
    data: {
      aktorId: session.profile.id,
      aktorPeran: session.profile.role,
      aksi: entry.aksi,
      entitas: entry.entitas,
      entitasId: entry.entitasId,
      nilaiLama: entry.nilaiLama ?? Prisma.JsonNull,
      nilaiBaru: entry.nilaiBaru,
      alasan: entry.alasan,
    },
  });
}

// Bobot disimpan positif di AturanPelanggaran; API memakai angka negatif.
function ruleSnapshot(rule: { nama: string; severity: string; bobotPoin: number; aktif: boolean }) {
  return { nama: rule.nama, severity: rule.severity, bobotPoin: -rule.bobotPoin, aktif: rule.aktif };
}

// Pelanggaran dari laporan yang punishment-nya belum disetujui (belum diberi,
// berjalan, atau terlambat); sama dengan getViolationResolution.
async function studentsWithUnresolvedViolations(): Promise<number[]> {
  const rows = await database.pointChange.findMany({
    where: {
      type: "REPORTED_VIOLATION",
      delta: { lt: 0 },
      sanggahans: { none: { status: "DISETUJUI" } },
    },
    select: {
      studentId: true,
      pembinaans: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true } },
    },
  });
  return [...new Set(
    rows.filter((row) => row.pembinaans[0]?.status !== "DISETUJUI").map((row) => row.studentId),
  )];
}

function sortOrderOf(query: Request["query"]): SortOrder {
  return queryString(query.urut) in sortOrders ? (queryString(query.urut) as SortOrder) : "poin_asc";
}

// Filter Monitoring Mahasiswa; dipakai tabel dashboard dan ekspor agar isinya sama.
async function monitoringWhere(
  query: Request["query"],
  settings: PointSettings,
): Promise<Prisma.MahasiswaWhereInput> {
  const search = queryString(query.q).slice(0, 100);
  const prodi = queryString(query.prodi).slice(0, 200);
  const angkatan = queryInteger(query.angkatan);
  const status = queryString(query.status) as StatusPoin;
  const violationFilter = queryString(query.pelanggaran);
  const statusRange = statusCodes.includes(status) ? scoreRangeForStatus(status, settings) : null;
  const countedViolation: Prisma.PointChangeWhereInput = {
    type: { in: violationLedgerTypes },
    delta: { lt: 0 },
    sanggahans: { none: { status: "DISETUJUI" } },
  };
  return {
    ...(search
      ? {
          OR: [
            { nama: { contains: search, mode: "insensitive" } },
            { dosenPa: { nama: { contains: search, mode: "insensitive" } } },
            ...(/^\d{1,9}$/.test(search) ? [{ nim: Number(search) }] : []),
          ],
        }
      : {}),
    ...(prodi ? { jurusan: prodi } : {}),
    ...(angkatan ? { angkatan } : {}),
    ...(statusRange ? { pointScore: { gte: statusRange.min, lte: statusRange.max } } : {}),
    ...(violationFilter === "UNRESOLVED" ? { id: { in: await studentsWithUnresolvedViolations() } } : {}),
    ...(violationFilter === "HAS_VIOLATION" ? { pointChanges: { some: countedViolation } } : {}),
    ...(violationFilter === "NONE" ? { pointChanges: { none: countedViolation } } : {}),
  };
}

const monitoringStudentSelect = {
  id: true,
  nim: true,
  nama: true,
  jurusan: true,
  angkatan: true,
  statusClearance: true,
  dosenPa: { select: { nama: true, nuptk: true } },
} satisfies Prisma.MahasiswaSelect;

// Satu baris tabel Monitoring Mahasiswa beserta rincian pelanggarannya.
async function monitoringRows(
  students: Prisma.MahasiswaGetPayload<{ select: typeof monitoringStudentSelect }>[],
) {
  const ids = students.map((student) => student.id);
  const [pointStatuses, violationCounts, violations] = await Promise.all([
    getStudentPointStatuses(database, ids),
    countViolations(database, ids),
    listViolationsWithResolution(database, ids),
  ]);
  return students.map((student) => {
    const point = pointStatuses.get(student.id)!;
    const studentViolations = violations.get(student.id) ?? [];
    return {
      dosenPa: student.dosenPa
        ? { nama: student.dosenPa.nama, nuptk: student.dosenPa.nuptk.toString() }
        : null,
      pelanggaran: studentViolations,
      pelanggaranBelumSelesai: studentViolations.filter((violation) =>
        unresolvedViolationStatuses.includes(violation.status),
      ).length,
      id: student.id,
      nim: student.nim,
      nama: student.nama,
      prodi: student.jurusan,
      angkatan: student.angkatan,
      poin: point.score,
      status: { kode: point.status.kode, label: point.status.label },
      jumlahPelanggaran: violationCounts.get(student.id) ?? 0,
      statusClearance: student.statusClearance,
    };
  });
}

function sendExport(
  response: Response,
  format: ExportFormat,
  label: string,
  rows: Awaited<ReturnType<typeof monitoringRows>>,
) {
  const body = format === "xlsx" ? buildStudentExportWorkbook(rows) : buildStudentExportCsv(rows);
  response.setHeader("Content-Type", exportContentType(format));
  response.setHeader("Content-Disposition", `attachment; filename="${exportFileName(label, format)}"`);
  response.setHeader("Cache-Control", "no-store");
  response.send(body);
}

function exportFormatOf(query: Request["query"]): ExportFormat | null {
  const format = queryString(query.format) || "xlsx";
  return format === "xlsx" || format === "csv" ? format : null;
}

// Batas ekspor massal agar satu permintaan tidak membebani server.
const MAX_EXPORT_STUDENTS = 5000;

// Rekap seluruh mahasiswa sesuai filter aktif (semua halaman, urutan sama).
kemahasiswaanRouter.get("/admin/poin/mahasiswa/ekspor", async (request, response) => {
  const format = exportFormatOf(request.query);
  if (!format) {
    response.status(400).json({ message: "Format ekspor harus xlsx atau csv." });
    return;
  }
  try {
    const settings = await getPointSettings(database);
    const where = await monitoringWhere(request.query, settings);
    const total = await database.mahasiswa.count({ where });
    if (total > MAX_EXPORT_STUDENTS) {
      response.status(413).json({
        message: `Data terlalu banyak (${total} mahasiswa). Persempit filter hingga maksimal ${MAX_EXPORT_STUDENTS} mahasiswa.`,
      });
      return;
    }
    const students = await database.mahasiswa.findMany({
      where,
      orderBy: sortOrders[sortOrderOf(request.query)],
      select: monitoringStudentSelect,
    });
    sendExport(response, format, "Monitoring_Mahasiswa", await monitoringRows(students));
  } catch (error) {
    console.error("Gagal mengekspor data monitoring mahasiswa:", error);
    response.status(500).json({ message: "Ekspor data mahasiswa gagal." });
  }
});

// Rekap satu mahasiswa (ikon unduh di kolom Clearance).
kemahasiswaanRouter.get("/admin/poin/mahasiswa/:id/ekspor", async (request, response) => {
  const id = queryInteger(request.params.id);
  const format = exportFormatOf(request.query);
  if (!id || !format) {
    response.status(400).json({ message: "Permintaan ekspor tidak valid." });
    return;
  }
  try {
    const student = await database.mahasiswa.findUnique({ where: { id }, select: monitoringStudentSelect });
    if (!student) {
      response.status(404).json({ message: "Mahasiswa tidak ditemukan." });
      return;
    }
    sendExport(response, format, `${student.nim}_${student.nama}`, await monitoringRows([student]));
  } catch (error) {
    console.error("Gagal mengekspor data mahasiswa:", error);
    response.status(500).json({ message: "Ekspor data mahasiswa gagal." });
  }
});

kemahasiswaanRouter.get("/admin/poin/mahasiswa", async (request, response) => {
  const sort = sortOrderOf(request.query);
  const pageSize = pageSizes.includes(queryInteger(request.query.per) ?? 0)
    ? queryInteger(request.query.per)!
    : 20;
  const requestedPage = Math.max(1, queryInteger(request.query.halaman) ?? 1);

  try {
    const settings = await getPointSettings(database);
    const where = await monitoringWhere(request.query, settings);

    const [total, prodiRows, angkatanRows, overallTotal, statusCounts] = await Promise.all([
      database.mahasiswa.count({ where }),
      database.mahasiswa.findMany({ distinct: ["jurusan"], select: { jurusan: true }, orderBy: { jurusan: "asc" } }),
      database.mahasiswa.findMany({
        where: { angkatan: { not: null } },
        distinct: ["angkatan"],
        select: { angkatan: true },
        orderBy: { angkatan: "desc" },
      }),
      database.mahasiswa.count(),
      Promise.all(
        statusCodes.map(async (kode) => {
          const range = scoreRangeForStatus(kode, settings);
          return [
            kode,
            range ? await database.mahasiswa.count({ where: { pointScore: { gte: range.min, lte: range.max } } }) : 0,
          ] as const;
        }),
      ),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(requestedPage, totalPages);
    const students = await database.mahasiswa.findMany({
      where,
      orderBy: sortOrders[sort],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: monitoringStudentSelect,
    });

    response.json({
      mahasiswa: await monitoringRows(students),
      halaman: page,
      totalHalaman: totalPages,
      per: pageSize,
      total,
      ringkasan: { total: overallTotal, perStatus: Object.fromEntries(statusCounts) },
      batasStatus: settings.batasStatus.map((threshold) => ({
        ...threshold,
        ...scoreRangeForStatus(threshold.kode, settings),
      })),
      poinAwal: settings.poinAwal,
      filter: {
        prodi: prodiRows.map((row) => row.jurusan),
        angkatan: angkatanRows.map((row) => row.angkatan),
      },
    });
  } catch (error) {
    console.error("Gagal memuat data poin mahasiswa:", error);
    response.status(500).json({ message: "Data poin mahasiswa gagal dimuat." });
  }
});

kemahasiswaanRouter.get("/admin/poin/aturan", async (_request, response) => {
  try {
    const [rules, usage, levels, history] = await Promise.all([
      database.aturanPelanggaran.findMany({
        orderBy: [{ pillar: "asc" }, { bobotPoin: "asc" }, { nama: "asc" }],
      }),
      database.laporan.groupBy({ by: ["aturanId"], where: { aturanId: { not: null } }, _count: { _all: true } }),
      database.tingkatPelanggaran.findMany({ orderBy: [{ pillar: "asc" }, { bobotPoin: "desc" }] }),
      database.logAudit.findMany({
        where: { entitas: { in: ["AturanPelanggaran", "TingkatPelanggaran"] } },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);
    const usageByRule = new Map(usage.map((row) => [row.aturanId, row._count._all]));
    const actorIds = [...new Set(history.filter((row) => row.aktorPeran === "admin").map((row) => row.aktorId))];
    const actors = await database.kemahasiswaan.findMany({
      where: { id: { in: actorIds } },
      select: { id: true, nama: true },
    });
    const actorNames = new Map(actors.map((actor) => [actor.id, actor.nama]));

    response.json({
      kategori: Object.entries(disciplinePillarLabels).map(([kode, label]) => ({ kode, label })),
      tingkatLabel: violationSeverityLabels,
      aturan: rules.map((rule) => ({
        id: rule.id,
        pillar: rule.pillar,
        nama: rule.nama,
        severity: rule.severity,
        bobotPoin: -rule.bobotPoin,
        aktif: rule.aktif,
        jumlahDipakai: usageByRule.get(rule.id) ?? 0,
      })),
      tingkat: levels
        .filter((level) => level.severity !== "SANGAT_BERAT")
        .map((level) => ({
          id: level.id,
          pillar: level.pillar,
          severity: level.severity,
          bobotPoin: level.bobotPoin,
          aktif: level.aktif,
        })),
      riwayat: history.map((row) => ({
        id: row.id,
        aksi: row.aksi,
        entitas: row.entitas,
        entitasId: row.entitasId,
        nilaiLama: row.nilaiLama,
        nilaiBaru: row.nilaiBaru,
        alasan: row.alasan,
        oleh: actorNames.get(row.aktorId) ?? `${row.aktorPeran ?? "pengguna"} #${row.aktorId}`,
        waktu: row.createdAt,
      })),
    });
  } catch (error) {
    console.error("Gagal memuat pengaturan pengurangan poin:", error);
    response.status(500).json({ message: "Pengaturan pengurangan poin gagal dimuat." });
  }
});

kemahasiswaanRouter.post("/admin/poin/aturan", async (request, response) => {
  const session = currentSession(response);
  const body = parseBody(violationRuleCreateSchema, request.body);
  if (!body) {
    response.status(400).json({
      message: "Lengkapi kategori, nama pelanggaran (min. 3 karakter), tingkat, pengurangan poin (-1 s.d. -100), dan alasan (min. 5 karakter).",
    });
    return;
  }
  try {
    const rule = await database.$transaction(async (transaction) => {
      const created = await transaction.aturanPelanggaran.create({
        data: {
          pillar: body.pillar,
          nama: body.nama,
          severity: body.severity,
          bobotPoin: -body.bobotPoin,
          aktif: true,
        },
      });
      await writeSettingsAudit(transaction, session, {
        aksi: "ATURAN_POIN_DITAMBAH",
        entitas: "AturanPelanggaran",
        entitasId: created.id,
        nilaiLama: null,
        nilaiBaru: { pillar: created.pillar, ...ruleSnapshot(created) },
        alasan: body.alasan,
      });
      return created;
    });
    response.status(201).json({ aturan: { id: rule.id } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      response.status(409).json({ message: "Nama pelanggaran tersebut sudah ada pada kategori ini." });
      return;
    }
    console.error("Gagal menambah aturan pengurangan poin:", error);
    response.status(500).json({ message: "Aturan pengurangan poin gagal disimpan." });
  }
});

kemahasiswaanRouter.patch("/admin/poin/aturan/:id", async (request, response) => {
  const session = currentSession(response);
  const id = queryInteger(request.params.id);
  const body = parseBody(violationRuleUpdateSchema, request.body);
  if (!id || !body) {
    response.status(400).json({
      message: "Perubahan tidak valid. Pengurangan poin harus -1 s.d. -100 dan alasan wajib diisi (min. 5 karakter).",
    });
    return;
  }
  try {
    const result = await database.$transaction(async (transaction) => {
      const before = await transaction.aturanPelanggaran.findUnique({ where: { id } });
      if (!before) return null;
      const after = await transaction.aturanPelanggaran.update({
        where: { id },
        data: {
          ...(body.nama !== undefined ? { nama: body.nama } : {}),
          ...(body.severity !== undefined ? { severity: body.severity } : {}),
          ...(body.bobotPoin !== undefined ? { bobotPoin: -body.bobotPoin } : {}),
          ...(body.aktif !== undefined ? { aktif: body.aktif } : {}),
        },
      });
      await writeSettingsAudit(transaction, session, {
        aksi: "ATURAN_POIN_DIUBAH",
        entitas: "AturanPelanggaran",
        entitasId: id,
        nilaiLama: ruleSnapshot(before),
        nilaiBaru: ruleSnapshot(after),
        alasan: body.alasan,
      });
      return after;
    });
    if (!result) {
      response.status(404).json({ message: "Aturan pelanggaran tidak ditemukan." });
      return;
    }
    response.json({ aturan: { id: result.id } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      response.status(409).json({ message: "Nama pelanggaran tersebut sudah ada pada kategori ini." });
      return;
    }
    console.error("Gagal mengubah aturan pengurangan poin:", error);
    response.status(500).json({ message: "Perubahan aturan gagal disimpan." });
  }
});

kemahasiswaanRouter.patch("/admin/poin/tingkat/:id", async (request, response) => {
  const session = currentSession(response);
  const id = queryInteger(request.params.id);
  const body = parseBody(violationLevelUpdateSchema, request.body);
  if (!id || !body) {
    response.status(400).json({
      message: "Perubahan tidak valid. Bobot harus -1 s.d. -100 dan alasan wajib diisi (min. 5 karakter).",
    });
    return;
  }
  try {
    const result = await database.$transaction(async (transaction) => {
      const before = await transaction.tingkatPelanggaran.findUnique({ where: { id } });
      if (!before || before.severity === "SANGAT_BERAT") return null;
      const after = await transaction.tingkatPelanggaran.update({
        where: { id },
        data: {
          ...(body.bobotPoin !== undefined ? { bobotPoin: body.bobotPoin } : {}),
          ...(body.aktif !== undefined ? { aktif: body.aktif } : {}),
        },
      });
      await writeSettingsAudit(transaction, session, {
        aksi: "BOBOT_TINGKAT_DIUBAH",
        entitas: "TingkatPelanggaran",
        entitasId: id,
        nilaiLama: { pillar: before.pillar, severity: before.severity, bobotPoin: before.bobotPoin, aktif: before.aktif },
        nilaiBaru: { pillar: after.pillar, severity: after.severity, bobotPoin: after.bobotPoin, aktif: after.aktif },
        alasan: body.alasan,
      });
      return after;
    });
    if (!result) {
      response.status(404).json({ message: "Tingkat pelanggaran tidak ditemukan." });
      return;
    }
    response.json({ tingkat: { id: result.id } });
  } catch (error) {
    console.error("Gagal mengubah bobot tingkat pelanggaran:", error);
    response.status(500).json({ message: "Perubahan bobot tingkat gagal disimpan." });
  }
});
