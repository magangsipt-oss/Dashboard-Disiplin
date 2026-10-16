export const pointChangeRules = {
  late: { type: "LATE", delta: -2 },
  unexcused_absence: { type: "UNEXCUSED_ABSENCE", delta: -5 },
  discipline_violation: { type: "DISCIPLINE_VIOLATION", delta: -10 },
  competition: { type: "COMPETITION", delta: 10 },
  non_academic_activity: { type: "NON_ACADEMIC_ACTIVITY", delta: 5 },
} as const;

export type PointChangeAction = keyof typeof pointChangeRules;

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
  const nextScore = Math.max(
    0,
    Math.min(200, currentScore + pointChangeRules[action].delta),
  );
  return { score: nextScore, delta: nextScore - currentScore };
}
