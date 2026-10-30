import assert from "node:assert/strict";
import test from "node:test";
import {
  calculatePointChange,
  calculatePointChangeForDelta,
  countPunishmentPenaltyDays,
  getPointChangeMetadata,
  getScorePredicate,
  violationSeverityPointRanges,
  punishmentPenaltyPerDay,
  violationSeverityFollowUps,
} from "../src/points";
import { getViolationResolution, isPunishmentLate, todayInCampusTime } from "../src/punishment";

test("score predicates honor the configured threshold boundaries", () => {
  assert.equal(getScorePredicate(200), "Disiplin");
  assert.equal(getScorePredicate(90), "Disiplin");
  assert.equal(getScorePredicate(89), "Kurang disiplin");
  assert.equal(getScorePredicate(51), "Kurang disiplin");
  assert.equal(getScorePredicate(50), "Tidak disiplin");
  assert.equal(getScorePredicate(0), "Tidak disiplin");
});

test("point changes start from 100 and apply the agreed values", () => {
  assert.deepEqual(calculatePointChange(100, "late"), { score: 98, delta: -2 });
  assert.deepEqual(calculatePointChange(100, "unexcused_absence"), {
    score: 95,
    delta: -5,
  });
  assert.deepEqual(calculatePointChange(100, "discipline_violation"), {
    score: 90,
    delta: -10,
  });
  assert.deepEqual(calculatePointChange(100, "competition"), {
    score: 110,
    delta: 10,
  });
  assert.deepEqual(calculatePointChange(100, "non_academic_activity"), {
    score: 105,
    delta: 5,
  });
});

test("confirmed violation point deductions can be restored as a positive change", () => {
  const deducted = calculatePointChangeForDelta(100, -15);
  const restored = calculatePointChangeForDelta(
    deducted.score,
    Math.abs(deducted.delta),
  );

  assert.deepEqual(deducted, { score: 85, delta: -15 });
  assert.deepEqual(restored, { score: 100, delta: 15 });
});

test("point changes stay within the 0 to 200 score range", () => {
  assert.deepEqual(calculatePointChange(0, "discipline_violation"), {
    score: 0,
    delta: 0,
  });
  assert.deepEqual(calculatePointChange(198, "competition"), {
    score: 200,
    delta: 2,
  });
});

test("point change metadata maps violations to the proposed pillars and levels", () => {
  assert.deepEqual(getPointChangeMetadata("LATE"), {
    pillar: "WAKTU",
    severity: "RINGAN",
  });
  assert.deepEqual(getPointChangeMetadata("UNEXCUSED_ABSENCE"), {
    pillar: "WAKTU",
    severity: "SEDANG",
  });
  assert.deepEqual(getPointChangeMetadata("DISCIPLINE_VIOLATION"), {
    pillar: "TATA_TERTIB",
    severity: "BERAT",
  });
  assert.deepEqual(getPointChangeMetadata("COMPETITION"), {
    pillar: null,
    severity: null,
  });
  assert.deepEqual(getPointChangeMetadata("NON_ACADEMIC_ACTIVITY"), {
    pillar: null,
    severity: null,
  });
});

test("all stored violation severities use educational follow-up guidance", () => {
  assert.match(violationSeverityFollowUps.RINGAN, /Pembinaan edukatif/);
  assert.match(violationSeverityFollowUps.SEDANG, /Pembinaan edukatif/);
  assert.match(violationSeverityFollowUps.BERAT, /Kemahasiswaan/);
  assert.equal(
    violationSeverityFollowUps.SANGAT_BERAT,
    violationSeverityFollowUps.BERAT,
  );
});

test("reported violation deductions use the configured severity ranges", () => {
  assert.deepEqual(violationSeverityPointRanges.RINGAN, {
    minimum: 5,
    maximum: 10,
  });
  assert.deepEqual(violationSeverityPointRanges.SEDANG, {
    minimum: 10,
    maximum: 20,
  });
  assert.deepEqual(violationSeverityPointRanges.BERAT, {
    minimum: 15,
    maximum: 30,
  });
  assert.equal(violationSeverityPointRanges.SANGAT_BERAT, undefined);
});

test("punishment penalties start the day after the deadline and skip counted days", () => {
  const date = (value: string) => new Date(`${value}T00:00:00.000Z`);
  const deadline = date("2026-10-29");
  assert.equal(countPunishmentPenaltyDays(deadline, null, date("2026-10-28")), 0);
  assert.equal(countPunishmentPenaltyDays(deadline, null, date("2026-10-29")), 0);
  assert.equal(countPunishmentPenaltyDays(deadline, null, date("2026-10-30")), 1);
  assert.equal(countPunishmentPenaltyDays(deadline, null, date("2026-11-02")), 4);
  assert.equal(countPunishmentPenaltyDays(deadline, date("2026-11-01"), date("2026-11-02")), 1);
  assert.equal(countPunishmentPenaltyDays(deadline, date("2026-11-02"), date("2026-11-02")), 0);
  assert.equal(punishmentPenaltyPerDay, 2);
});

test("campus day rolls over at midnight WITA", () => {
  assert.equal(
    todayInCampusTime(new Date("2026-10-29T15:59:00.000Z")).toISOString(),
    "2026-10-29T00:00:00.000Z",
  );
  assert.equal(
    todayInCampusTime(new Date("2026-10-29T16:00:00.000Z")).toISOString(),
    "2026-10-30T00:00:00.000Z",
  );
});

test("punishment lateness covers overdue open tasks and anything already penalized", () => {
  const today = new Date("2026-10-30T00:00:00.000Z");
  const past = new Date("2026-10-29T00:00:00.000Z");
  const future = new Date("2026-11-05T00:00:00.000Z");
  assert.equal(isPunishmentLate({ status: "DIMINTA", batasWaktu: future, hariDenda: 0 }, today), false);
  assert.equal(isPunishmentLate({ status: "DIMINTA", batasWaktu: past, hariDenda: 0 }, today), true);
  assert.equal(isPunishmentLate({ status: "DITOLAK", batasWaktu: past, hariDenda: 0 }, today), true);
  // Bukti dikirim tepat waktu dan sedang diperiksa: tetap berjalan.
  assert.equal(isPunishmentLate({ status: "DIKIRIM", batasWaktu: past, hariDenda: 0 }, today), false);
  assert.equal(isPunishmentLate({ status: "DIKIRIM", batasWaktu: past, hariDenda: 2 }, today), true);
  assert.equal(isPunishmentLate({ status: "DISETUJUI", batasWaktu: past, hariDenda: 0 }, today), false);
  assert.equal(isPunishmentLate({ status: "DISETUJUI", batasWaktu: past, hariDenda: 3 }, today), true);
});

test("violation resolution follows the punishment lifecycle", () => {
  const today = new Date("2026-10-30T00:00:00.000Z");
  const future = new Date("2026-11-05T00:00:00.000Z");
  const past = new Date("2026-10-29T00:00:00.000Z");
  const reported = (punishment: Parameters<typeof getViolationResolution>[0]["punishment"]) =>
    getViolationResolution({ type: "REPORTED_VIOLATION", sanggahanDisetujui: false, punishment }, today);
  assert.equal(reported(null), "BELUM_PUNISHMENT");
  assert.equal(reported({ status: "DIMINTA", batasWaktu: future, hariDenda: 0 }), "BERJALAN");
  assert.equal(reported({ status: "DIMINTA", batasWaktu: past, hariDenda: 0 }), "TERLAMBAT");
  assert.equal(reported({ status: "DISETUJUI", batasWaktu: past, hariDenda: 3 }), "SELESAI");
  assert.equal(
    getViolationResolution({ type: "REPORTED_VIOLATION", sanggahanDisetujui: true, punishment: null }, today),
    "DIBATALKAN",
  );
  assert.equal(
    getViolationResolution({ type: "LATE", sanggahanDisetujui: false, punishment: null }, today),
    "TANPA_PUNISHMENT",
  );
});
