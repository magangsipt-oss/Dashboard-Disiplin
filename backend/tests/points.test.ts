import assert from "node:assert/strict";
import test from "node:test";
import { calculatePointChange, getScorePredicate } from "../src/points";

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
