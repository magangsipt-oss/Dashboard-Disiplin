import assert from "node:assert/strict";
import test from "node:test";
import { escapeHtml } from "../src/mailer";
import { hashPassword, isHashedPassword, verifyPassword } from "../src/password";
import {
  appealSchema,
  counselingSchema,
  loginSchema,
  parseBody,
  trainingEvidenceSchema,
} from "../src/validation";

test("password di-hash dengan scrypt dan diverifikasi", async () => {
  const hash = await hashPassword("rahasia123");
  assert.ok(isHashedPassword(hash));
  assert.equal(await verifyPassword("rahasia123", hash), true);
  assert.equal(await verifyPassword("salah", hash), false);
});

test("password teks polos lama ditolak", async () => {
  assert.equal(await verifyPassword("rahasia123", "rahasia123"), false);
  assert.equal(await verifyPassword("x", "scrypt$rusak"), false);
});

test("escapeHtml menetralkan karakter HTML", () => {
  assert.equal(
    escapeHtml(`<img src=x onerror="a('b')">&`),
    "&lt;img src=x onerror=&quot;a(&#39;b&#39;)&quot;&gt;&amp;",
  );
});

test("loginSchema memangkas identitas dan menolak peran asing", () => {
  assert.deepEqual(parseBody(loginSchema, { role: "mhs", identity: " 123 ", password: "p" }), {
    role: "mhs",
    identity: "123",
    password: "p",
  });
  assert.equal(parseBody(loginSchema, { role: "root", identity: "a", password: "p" }), null);
  assert.equal(parseBody(loginSchema, undefined), null);
});

test("counselingSchema menolak tanggal yang tidak ada", () => {
  const base = { studentId: 1, type: "GUIDANCE_NOTE", note: "catatan" };
  assert.ok(parseBody(counselingSchema, { ...base, counselingDate: "2026-02-28" }));
  assert.equal(parseBody(counselingSchema, { ...base, counselingDate: "2026-02-30" }), null);
  assert.equal(parseBody(counselingSchema, { ...base, studentId: "1", counselingDate: "2026-02-28" }), null);
});

test("appealSchema butuh alasan minimal 20 karakter", () => {
  assert.equal(parseBody(appealSchema, { perubahanPoinId: "5", alasan: "pendek" }), null);
  assert.equal(parseBody(appealSchema, { perubahanPoinId: "5", alasan: "a".repeat(20) })?.perubahanPoinId, 5);
});

test("trainingEvidenceSchema hanya menerima http/https", () => {
  assert.ok(parseBody(trainingEvidenceSchema, { buktiUrl: "https://drive.example/x" }));
  assert.equal(parseBody(trainingEvidenceSchema, { buktiUrl: "javascript:alert(1)" }), null);
  assert.equal(parseBody(trainingEvidenceSchema, { buktiUrl: "data:text/html,hi" }), null);
  assert.equal(parseBody(trainingEvidenceSchema, { buktiUrl: "https://a.b", catatan: null })?.catatan, "");
});
