import {
  Prisma,
  type DisciplinePillar,
  type PointChangeType,
  type StatusPoin,
  type ViolationSeverity,
} from "@prisma/client";

// Service pusat poin kedisiplinan. Saldo poin = poin awal + jumlah semua
// baris PerubahanPoin milik mahasiswa, dibatasi poin minimal/maksimal.
// Kolom Mahasiswa.Poin hanya cache dari nilai itu dan hanya ditulis di sini.

type Client = Prisma.TransactionClient;

export type StatusThreshold = {
  kode: StatusPoin;
  label: string;
  batasBawah: number;
};

export type PointSettings = {
  poinAwal: number;
  poinMinimal: number;
  poinMaksimal: number;
  potonganBerulangMin: number;
  potonganBerulangMaks: number;
  // Urut dari batas bawah tertinggi.
  batasStatus: StatusThreshold[];
};

// Sama dengan nilai default di migrasi 20261030030000_add_point_settings;
// dipakai hanya bila baris pengaturan belum ada.
export const defaultPointSettings: PointSettings = {
  poinAwal: 100,
  poinMinimal: 0,
  poinMaksimal: 200,
  potonganBerulangMin: 5,
  potonganBerulangMaks: 10,
  batasStatus: [
    { kode: "SANGAT_BAIK", label: "Sangat Baik", batasBawah: 90 },
    { kode: "BAIK", label: "Baik", batasBawah: 75 },
    { kode: "PERLU_PEMBINAAN", label: "Perlu Pembinaan", batasBawah: 60 },
    { kode: "TINDAK_LANJUT_KHUSUS", label: "Tindak Lanjut Khusus", batasBawah: 0 },
  ],
};

export async function getPointSettings(client: Client): Promise<PointSettings> {
  const [settings, thresholds] = await Promise.all([
    client.pengaturanPoin.findUnique({ where: { id: 1 } }),
    client.batasStatusPoin.findMany({ orderBy: { batasBawah: "desc" } }),
  ]);
  return {
    poinAwal: settings?.poinAwal ?? defaultPointSettings.poinAwal,
    poinMinimal: settings?.poinMinimal ?? defaultPointSettings.poinMinimal,
    poinMaksimal: settings?.poinMaksimal ?? defaultPointSettings.poinMaksimal,
    potonganBerulangMin: settings?.potonganBerulangMin ?? defaultPointSettings.potonganBerulangMin,
    potonganBerulangMaks: settings?.potonganBerulangMaks ?? defaultPointSettings.potonganBerulangMaks,
    batasStatus:
      thresholds.length > 0
        ? thresholds.map(({ kode, label, batasBawah }) => ({ kode, label, batasBawah }))
        : defaultPointSettings.batasStatus,
  };
}

export function clampScore(
  score: number,
  settings: Pick<PointSettings, "poinMinimal" | "poinMaksimal">,
): number {
  return Math.max(settings.poinMinimal, Math.min(settings.poinMaksimal, score));
}

export function scoreFromLedgerSum(
  ledgerSum: number,
  settings: Pick<PointSettings, "poinAwal" | "poinMinimal" | "poinMaksimal">,
): number {
  return clampScore(settings.poinAwal + ledgerSum, settings);
}

export function classifyPointStatus(
  score: number,
  batasStatus: StatusThreshold[],
): StatusThreshold {
  const sorted = [...batasStatus].sort((a, b) => b.batasBawah - a.batasBawah);
  return sorted.find((threshold) => score >= threshold.batasBawah) ?? sorted[sorted.length - 1];
}

// Rentang poin (inklusif) sebuah status, untuk filter daftar mahasiswa.
export function scoreRangeForStatus(
  kode: StatusPoin,
  settings: Pick<PointSettings, "poinMinimal" | "poinMaksimal" | "batasStatus">,
): { min: number; max: number } | null {
  const sorted = [...settings.batasStatus].sort((a, b) => b.batasBawah - a.batasBawah);
  const index = sorted.findIndex((threshold) => threshold.kode === kode);
  if (index === -1) return null;
  return {
    min: index === sorted.length - 1 ? settings.poinMinimal : sorted[index].batasBawah,
    max: index === 0 ? settings.poinMaksimal : sorted[index - 1].batasBawah - 1,
  };
}

// Jenis ledger yang dihitung sebagai pelanggaran (bukan denda/pemulihan/tambahan).
export const violationLedgerTypes: PointChangeType[] = [
  "REPORTED_VIOLATION",
  "DISCIPLINE_VIOLATION",
  "LATE",
  "UNEXCUSED_ABSENCE",
];

// Jumlah pelanggaran per mahasiswa; yang dibatalkan lewat sanggahan disetujui
// tidak dihitung.
export async function countViolations(
  client: Client,
  studentIds: number[],
): Promise<Map<number, number>> {
  if (studentIds.length === 0) return new Map();
  const counts = await client.pointChange.groupBy({
    by: ["studentId"],
    where: {
      studentId: { in: studentIds },
      type: { in: violationLedgerTypes },
      sanggahans: { none: { status: "DISETUJUI" } },
    },
    _count: { _all: true },
  });
  return new Map(counts.map((row) => [row.studentId, row._count._all]));
}

// Bobot (negatif) kategori × tingkat yang aktif, atau null bila nonaktif.
export async function getActiveViolationWeight(
  client: Client,
  pillar: DisciplinePillar,
  severity: ViolationSeverity,
): Promise<number | null> {
  const level = await client.tingkatPelanggaran.findUnique({
    where: { pillar_severity: { pillar, severity } },
    select: { bobotPoin: true, aktif: true },
  });
  return level?.aktif && level.bobotPoin < 0 ? level.bobotPoin : null;
}

export async function getActiveViolationWeights(
  client: Client,
): Promise<Map<`${DisciplinePillar}:${ViolationSeverity}`, number>> {
  const levels = await client.tingkatPelanggaran.findMany({
    where: { aktif: true, bobotPoin: { lt: 0 } },
    select: { pillar: true, severity: true, bobotPoin: true },
  });
  return new Map(levels.map((level) => [`${level.pillar}:${level.severity}` as const, level.bobotPoin]));
}

// Potongan absensi Akademik: 1 Alpa = Disiplin Waktu Sedang, 2 Alpa = Berat,
// lebih dari 2 = Berat + tambahan berulang per Alpa (dibatasi rentang).
export function calculateAttendanceDeduction(
  alpa: number,
  weights: { sedang: number | null; berat: number | null },
  settings: Pick<PointSettings, "potonganBerulangMin" | "potonganBerulangMaks">,
): { delta: number; bobot: number; severity: ViolationSeverity; tambahan: number } | null {
  if (alpa <= 0) return null;
  if (alpa === 1) {
    return weights.sedang === null
      ? null
      : { delta: weights.sedang, bobot: weights.sedang, severity: "SEDANG", tambahan: 0 };
  }
  if (weights.berat === null) return null;
  const tambahan =
    alpa === 2
      ? 0
      : Math.min(settings.potonganBerulangMaks, (alpa - 2) * settings.potonganBerulangMin);
  return { delta: weights.berat - tambahan, bobot: weights.berat, severity: "BERAT", tambahan };
}

export type PointChangeInput = {
  studentId: number;
  type: PointChangeType;
  // Perubahan yang diminta; yang tersimpan bisa lebih kecil karena batas poin.
  delta: number;
  reason: string;
  recordedByIdentity: string;
  pillar?: DisciplinePillar | null;
  severity?: ViolationSeverity | null;
  bobotSnapshot?: number | null;
  referensiLaporanId?: number | null;
  createdAt?: Date;
};

export type PlannedPointChange = PointChangeInput & {
  scoreBefore: number;
  appliedDelta: number;
  scoreAfter: number;
};

// Menerapkan perubahan berurutan dari saldo awal tiap mahasiswa.
export function planPointChanges(
  startingScores: Map<number, number>,
  inputs: PointChangeInput[],
  settings: Pick<PointSettings, "poinMinimal" | "poinMaksimal">,
): PlannedPointChange[] {
  const running = new Map(startingScores);
  return inputs.map((input) => {
    const scoreBefore = running.get(input.studentId);
    if (scoreBefore === undefined) {
      throw new Error(`Mahasiswa #${input.studentId} tidak ditemukan.`);
    }
    const scoreAfter = clampScore(scoreBefore + input.delta, settings);
    running.set(input.studentId, scoreAfter);
    return { ...input, scoreBefore, appliedDelta: scoreAfter - scoreBefore, scoreAfter };
  });
}

async function lockAndReadScores(
  transaction: Client,
  studentIds: number[],
  settings: PointSettings,
): Promise<Map<number, number>> {
  const locked = await transaction.$queryRaw<Array<{ id: number }>>`
    SELECT "ID" AS id FROM "Mahasiswa"
    WHERE "ID" IN (${Prisma.join(studentIds)})
    ORDER BY "ID"
    FOR UPDATE`;
  const sums = await transaction.pointChange.groupBy({
    by: ["studentId"],
    where: { studentId: { in: studentIds } },
    _sum: { delta: true },
  });
  const sumByStudent = new Map(sums.map((row) => [row.studentId, row._sum.delta ?? 0]));
  return new Map(
    locked.map(({ id }) => [id, scoreFromLedgerSum(sumByStudent.get(id) ?? 0, settings)]),
  );
}

function toCreateInput(change: PlannedPointChange): Prisma.PointChangeUncheckedCreateInput {
  return {
    studentId: change.studentId,
    type: change.type,
    pillar: change.pillar ?? null,
    severity: change.severity ?? null,
    delta: change.appliedDelta,
    scoreAfter: change.scoreAfter,
    bobotSnapshot: change.bobotSnapshot ?? null,
    referensiLaporanId: change.referensiLaporanId ?? null,
    reason: change.reason.slice(0, 500),
    recordedByIdentity: change.recordedByIdentity.slice(0, 100),
    ...(change.createdAt ? { createdAt: change.createdAt } : {}),
  };
}

async function updateScoreCache(transaction: Client, planned: PlannedPointChange[]) {
  const finalScores = new Map(planned.map((change) => [change.studentId, change.scoreAfter]));
  const values = [...finalScores].map(
    ([id, score]) => Prisma.sql`(${id}::int, ${score}::int)`,
  );
  await transaction.$executeRaw`
    UPDATE "Mahasiswa" AS m SET "Poin" = v.poin
    FROM (VALUES ${Prisma.join(values)}) AS v(id, poin)
    WHERE m."ID" = v.id`;
}

// Mencatat banyak perubahan sekaligus (mis. impor absensi). Wajib dipanggil di
// dalam transaksi; baris mahasiswa dikunci sampai transaksi selesai.
// skipUnchanged: perubahan yang menjadi 0 karena batas poin tidak dicatat,
// tetapi tetap dikembalikan agar pemanggil tahu hasilnya.
export async function recordPointChanges(
  transaction: Client,
  inputs: PointChangeInput[],
  options: { skipUnchanged?: boolean } = {},
): Promise<PlannedPointChange[]> {
  if (inputs.length === 0) return [];
  const settings = await getPointSettings(transaction);
  const studentIds = [...new Set(inputs.map((input) => input.studentId))];
  const startingScores = await lockAndReadScores(transaction, studentIds, settings);
  const planned = planPointChanges(startingScores, inputs, settings);
  const toSave = options.skipUnchanged
    ? planned.filter((change) => change.appliedDelta !== 0)
    : planned;
  if (toSave.length > 0) {
    await transaction.pointChange.createMany({ data: toSave.map(toCreateInput) });
  }
  await updateScoreCache(transaction, planned);
  return planned;
}

export async function recordPointChange(
  transaction: Client,
  input: PointChangeInput,
): Promise<PlannedPointChange & { id: number }> {
  const settings = await getPointSettings(transaction);
  const startingScores = await lockAndReadScores(transaction, [input.studentId], settings);
  const [planned] = planPointChanges(startingScores, [input], settings);
  const saved = await transaction.pointChange.create({
    data: toCreateInput(planned),
    select: { id: true },
  });
  await updateScoreCache(transaction, [planned]);
  return { ...planned, id: saved.id };
}

// Saldo dan status poin langsung dari ledger (bukan dari cache).
export async function getStudentPointStatuses(
  client: Client,
  studentIds: number[],
): Promise<Map<number, { score: number; status: StatusThreshold }>> {
  if (studentIds.length === 0) return new Map();
  const settings = await getPointSettings(client);
  const sums = await client.pointChange.groupBy({
    by: ["studentId"],
    where: { studentId: { in: studentIds } },
    _sum: { delta: true },
  });
  const sumByStudent = new Map(sums.map((row) => [row.studentId, row._sum.delta ?? 0]));
  return new Map(
    studentIds.map((id) => {
      const score = scoreFromLedgerSum(sumByStudent.get(id) ?? 0, settings);
      return [id, { score, status: classifyPointStatus(score, settings.batasStatus) }];
    }),
  );
}
