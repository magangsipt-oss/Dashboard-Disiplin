import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import express from "express";
import { reportRouter } from "../src/discipline";
import { createTrackingCode, hashTrackingCode } from "../src/report-security";
import { calculatePointChangeForDelta, getPointChangeMetadata } from "../src/points";

test("anonymous reports have no reporter identity columns and tracking codes are stored as hashes", async () => {
  const schema = await readFile(resolve(__dirname, "../prisma/schema.prisma"), "utf8");
  const reportModel = schema.match(/model Laporan \{([\s\S]*?)\n\}/)?.[1];
  assert.ok(reportModel, "Laporan model exists");
  for (const forbiddenField of ["reporterId", "pelaporId", "ipAddress", "userAgent"]) {
    assert.doesNotMatch(
      reportModel,
      new RegExp(`^\\s*${forbiddenField}\\s`, "m"),
    );
  }
  assert.match(reportModel, /kodeHash\s+String\s+@unique/);

  const firstCode = createTrackingCode();
  const secondCode = createTrackingCode();
  assert.match(firstCode, /^[A-Z2-7]{32}$/);
  assert.notEqual(firstCode, secondCode);
  assert.match(hashTrackingCode(firstCode), /^[a-f0-9]{64}$/);
  assert.notEqual(hashTrackingCode(firstCode), firstCode);
  assert.equal(hashTrackingCode(firstCode), hashTrackingCode(firstCode));
});

test("reported violation metadata comes from the rule chosen during verification", () => {
  assert.deepEqual(
    getPointChangeMetadata("REPORTED_VIOLATION", {
      pillar: "PROSEDUR_K3",
      severity: "SANGAT_BERAT",
    }),
    { pillar: "PROSEDUR_K3", severity: "SANGAT_BERAT" },
  );
});

test("score changes from rules remain within the configured 0 to 200 bounds", () => {
  assert.deepEqual(calculatePointChangeForDelta(4, -20), { score: 0, delta: -4 });
  assert.deepEqual(calculatePointChangeForDelta(195, 20), { score: 200, delta: 5 });
});

test("tracking-status lookup is rate limited by client IP", async (context) => {
  const app = express();
  app.use(reportRouter);
  const server = createServer(app);
  await new Promise<void>((resolveListen) => {
    server.listen(0, "127.0.0.1", resolveListen);
  });
  context.after(async () => {
    await new Promise<void>((resolveClose, reject) => {
      server.close((error) => (error ? reject(error) : resolveClose()));
    });
  });

  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const endpoint = `http://127.0.0.1:${address.port}/laporan/status?kode=invalid`;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const response = await fetch(endpoint);
    assert.equal(response.status, 404);
  }
  const limitedResponse = await fetch(endpoint);
  assert.equal(limitedResponse.status, 429);
});
