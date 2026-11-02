import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateAttendanceDeduction,
  classifyPointStatus,
  defaultPointSettings,
  planPointChanges,
  scoreFromLedgerSum,
  scoreRangeForStatus,
} from "../src/point-ledger";

test("status score ranges cover the whole point range without gaps", () => {
  assert.deepEqual(scoreRangeForStatus("SANGAT_BAIK", defaultPointSettings), { min: 90, max: 200 });
  assert.deepEqual(scoreRangeForStatus("BAIK", defaultPointSettings), { min: 75, max: 89 });
  assert.deepEqual(scoreRangeForStatus("PERLU_PEMBINAAN", defaultPointSettings), { min: 60, max: 74 });
  assert.deepEqual(scoreRangeForStatus("TINDAK_LANJUT_KHUSUS", defaultPointSettings), { min: 0, max: 59 });
});

test("score is the starting points plus the ledger sum, bounded by min and max", () => {
  assert.equal(scoreFromLedgerSum(0, defaultPointSettings), 100);
  assert.equal(scoreFromLedgerSum(-35, defaultPointSettings), 65);
  assert.equal(scoreFromLedgerSum(-150, defaultPointSettings), 0);
  assert.equal(scoreFromLedgerSum(150, defaultPointSettings), 200);
});

test("default status thresholds follow the campus policy", () => {
  const status = (score: number) => classifyPointStatus(score, defaultPointSettings.batasStatus).kode;
  assert.equal(status(200), "SANGAT_BAIK");
  assert.equal(status(90), "SANGAT_BAIK");
  assert.equal(status(89), "BAIK");
  assert.equal(status(75), "BAIK");
  assert.equal(status(74), "PERLU_PEMBINAAN");
  assert.equal(status(60), "PERLU_PEMBINAAN");
  assert.equal(status(59), "TINDAK_LANJUT_KHUSUS");
  assert.equal(status(0), "TINDAK_LANJUT_KHUSUS");
});

test("custom thresholds are respected regardless of their order", () => {
  const thresholds = [
    { kode: "TINDAK_LANJUT_KHUSUS" as const, label: "TLK", batasBawah: 0 },
    { kode: "BAIK" as const, label: "Baik", batasBawah: 70 },
    { kode: "SANGAT_BAIK" as const, label: "Sangat Baik", batasBawah: 95 },
    { kode: "PERLU_PEMBINAAN" as const, label: "PP", batasBawah: 50 },
  ];
  assert.equal(classifyPointStatus(94, thresholds).kode, "BAIK");
  assert.equal(classifyPointStatus(50, thresholds).kode, "PERLU_PEMBINAAN");
});

test("planned changes apply in order and store the actually applied delta", () => {
  const planned = planPointChanges(
    new Map([[1, 20], [2, 195]]),
    [
      { studentId: 1, type: "REPORTED_VIOLATION", delta: -15, reason: "a", recordedByIdentity: "x" },
      { studentId: 1, type: "REPORTED_VIOLATION", delta: -15, reason: "b", recordedByIdentity: "x" },
      { studentId: 2, type: "COMPETITION", delta: 10, reason: "c", recordedByIdentity: "x" },
    ],
    defaultPointSettings,
  );
  assert.deepEqual(
    planned.map(({ scoreBefore, appliedDelta, scoreAfter }) => ({ scoreBefore, appliedDelta, scoreAfter })),
    [
      { scoreBefore: 20, appliedDelta: -15, scoreAfter: 5 },
      { scoreBefore: 5, appliedDelta: -5, scoreAfter: 0 },
      { scoreBefore: 195, appliedDelta: 5, scoreAfter: 200 },
    ],
  );
});

test("planning a change for an unknown student fails", () => {
  assert.throws(() =>
    planPointChanges(
      new Map(),
      [{ studentId: 9, type: "COMPETITION", delta: 5, reason: "x", recordedByIdentity: "x" }],
      defaultPointSettings,
    ),
  );
});

test("attendance deductions with default weights match the previous fixed values", () => {
  const weights = { sedang: -10, berat: -15 };
  const delta = (alpa: number) => calculateAttendanceDeduction(alpa, weights, defaultPointSettings)?.delta;
  assert.equal(delta(0), undefined);
  assert.equal(delta(1), -10);
  assert.equal(delta(2), -15);
  assert.equal(delta(3), -20);
  assert.equal(delta(4), -25);
  assert.equal(delta(9), -25);
});

test("attendance deductions follow customised weights and repeat range", () => {
  const settings = { potonganBerulangMin: 3, potonganBerulangMaks: 7 };
  const weights = { sedang: -8, berat: -12 };
  assert.deepEqual(calculateAttendanceDeduction(1, weights, settings), {
    delta: -8, bobot: -8, severity: "SEDANG", tambahan: 0,
  });
  assert.equal(calculateAttendanceDeduction(4, weights, settings)?.delta, -18);
  assert.equal(calculateAttendanceDeduction(6, weights, settings)?.delta, -19);
  assert.equal(calculateAttendanceDeduction(1, { sedang: null, berat: -12 }, settings), null);
});
