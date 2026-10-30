export const pointChangeRules = {
  late: { type: "LATE", delta: -2 },
  unexcused_absence: { type: "UNEXCUSED_ABSENCE", delta: -5 },
  discipline_violation: { type: "DISCIPLINE_VIOLATION", delta: -10 },
  competition: { type: "COMPETITION", delta: 10 },
  non_academic_activity: { type: "NON_ACADEMIC_ACTIVITY", delta: 5 },
} as const;

export type PointChangeAction = keyof typeof pointChangeRules;
export type PointChangeType =
  | (typeof pointChangeRules)[PointChangeAction]["type"]
  | "REPORTED_VIOLATION"
  | "POINT_RESTORATION"
  | "PUNISHMENT_PENALTY";
export type DisciplinePillar =
  | "WAKTU"
  | "AKADEMIK"
  | "TATA_TERTIB"
  | "PROSEDUR_K3"
  | "LINGKUNGAN";
export type ViolationSeverity =
  | "RINGAN"
  | "SEDANG"
  | "BERAT"
  | "SANGAT_BERAT";

export const pointChangeMetadata = {
  late: { pillar: "WAKTU", severity: "RINGAN" },
  unexcused_absence: { pillar: "WAKTU", severity: "SEDANG" },
  discipline_violation: { pillar: "TATA_TERTIB", severity: "BERAT" },
  competition: { pillar: null, severity: null },
  non_academic_activity: { pillar: null, severity: null },
} as const satisfies Record<
  PointChangeAction,
  { pillar: DisciplinePillar | null; severity: ViolationSeverity | null }
>;

export const disciplinePillarLabels: Record<DisciplinePillar, string> = {
  WAKTU: "Disiplin Waktu",
  AKADEMIK: "Disiplin Akademik",
  TATA_TERTIB: "Disiplin Tata Tertib dan Etika",
  PROSEDUR_K3: "Disiplin Prosedur dan Keselamatan (K3)",
  LINGKUNGAN: "Disiplin Lingkungan",
};

export const violationSeverityLabels: Record<ViolationSeverity, string> = {
  RINGAN: "Ringan",
  SEDANG: "Sedang",
  BERAT: "Berat",
  SANGAT_BERAT: "Sangat Berat",
};

export const violationSeverityFollowUps: Record<ViolationSeverity, string> = {
  RINGAN: "Pembinaan edukatif proporsional sesuai pilar pelanggaran",
  SEDANG: "Pembinaan edukatif, seperti refleksi tertulis, sesuai pilar",
  BERAT: "Pembinaan edukatif ditetapkan Kemahasiswaan sesuai hasil verifikasi",
  SANGAT_BERAT:
    "Pembinaan edukatif ditetapkan Kemahasiswaan sesuai hasil verifikasi",
};

export const violationSeverityPointRanges: Partial<
  Record<ViolationSeverity, { minimum: number; maximum: number }>
> = {
  RINGAN: { minimum: 5, maximum: 10 },
  SEDANG: { minimum: 10, maximum: 20 },
  BERAT: { minimum: 15, maximum: 30 },
};

export function getPointChangeMetadata(
  type: PointChangeType,
  selectedMetadata?: {
    pillar: DisciplinePillar;
    severity: ViolationSeverity;
  },
) {
  if (type === "REPORTED_VIOLATION") {
    return selectedMetadata ?? { pillar: null, severity: null };
  }
  if (type === "POINT_RESTORATION" || type === "PUNISHMENT_PENALTY") {
    return { pillar: null, severity: null };
  }

  const action = (Object.keys(pointChangeRules) as PointChangeAction[]).find(
    (candidate) => pointChangeRules[candidate].type === type,
  );
  if (!action) {
    throw new Error(`Jenis perubahan poin tidak dikenal: ${type}`);
  }
  return pointChangeMetadata[action];
}

export function calculatePointChangeForDelta(
  currentScore: number,
  requestedDelta: number,
): { score: number; delta: number } {
  const score = Math.max(0, Math.min(200, currentScore + requestedDelta));
  return { score, delta: score - currentScore };
}

export function getScorePredicate(
  score: number,
): "Disiplin" | "Kurang disiplin" | "Tidak disiplin" {
  if (score >= 90) {
    return "Disiplin";
  }
  if (score > 50) {
    return "Kurang disiplin";
  }
  return "Tidak disiplin";
}

export function calculatePointChange(
  currentScore: number,
  action: PointChangeAction,
): { score: number; delta: number } {
  return calculatePointChangeForDelta(
    currentScore,
    pointChangeRules[action].delta,
  );
}

// Sanksi punishment yang tidak ditindaklanjuti: 2 poin per hari lewat batas.
export const punishmentPenaltyPerDay = 2;
const dayInMilliseconds = 24 * 60 * 60 * 1000;

// Semua tanggal berupa tanggal kalender (UTC tengah malam, kolom @db.Date).
// Hari batas waktu masih boleh dikerjakan; denda mulai hari berikutnya.
// countedUntil adalah tanggal terakhir yang sudah dihitung atau dijeda.
export function countPunishmentPenaltyDays(
  deadline: Date,
  countedUntil: Date | null,
  today: Date,
): number {
  const start = Math.max(deadline.getTime(), countedUntil?.getTime() ?? 0);
  return Math.max(0, Math.floor((today.getTime() - start) / dayInMilliseconds));
}
