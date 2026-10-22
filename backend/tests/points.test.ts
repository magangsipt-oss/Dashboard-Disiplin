import assert from "node:assert/strict";
import test from "node:test";
import {
  calculatePointChange,
  getPointChangeMetadata,
  getScorePredicate,
  violationSeverityPointRanges,
  violationSeverityFollowUps,
} from "../src/points";

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

test("manual violation deductions use the configured severity ranges", () => {
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
