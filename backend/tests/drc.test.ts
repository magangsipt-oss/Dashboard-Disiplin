import assert from "node:assert/strict";
import test from "node:test";
import {
  describeDrcTarget,
  drcNotification,
  drcAngkatanWhere,
  drcEvidenceStatus,
  isDrcActivityPast,
  isDrcTargetedTo,
  uniqueProdiOptions,
  type DrcActivityText,
} from "../src/drc";
import { drcActivitySchema, drcActivityUpdateSchema, parseBody } from "../src/validation";

const activity: DrcActivityText = {
  judul: "Seminar Refreshment Kedisiplinan Mahasiswa",
  jenis: "SEMINAR",
  semester: "Ganjil 2026/2027",
  tanggal: new Date("2026-11-10T00:00:00.000Z"),
  jamMulai: "08:00",
  jamSelesai: "12:00",
  lokasi: "Auditorium Kampus",
  tema: ["WAKTU", "LINGKUNGAN"],
  deskripsi: "Bawa alat tulis.",
  targetProdi: ["Perawatan Mesin"],
  targetAngkatan: [2026, 2025],
};

const validBody = {
  judul: activity.judul,
  jenis: "SEMINAR",
  semester: activity.semester,
  tanggal: "2026-11-10",
  jamMulai: "08:00",
  jamSelesai: "12:00",
  lokasi: activity.lokasi,
  tema: ["WAKTU", "WAKTU", "AKADEMIK"],
};

test("notifikasi DLS baru memuat jadwal, tema, dan status wajib", () => {
  const { judul, isi } = drcNotification("BARU", activity);
  assert.equal(judul, "Kegiatan DLS Wajib: Seminar Refreshment Kedisiplinan Mahasiswa");
  assert.match(isi, /WAJIB Anda ikuti/);
  assert.match(isi, /Peserta  : Prodi Perawatan Mesin; angkatan 2025, 2026/);
  assert.match(isi, /Selasa, 10 November 2026/);
  assert.match(isi, /08:00–12:00 WITA/);
  assert.match(isi, /Disiplin Waktu, Disiplin Lingkungan/);
  assert.match(isi, /Bawa alat tulis\./);
});

test("notifikasi pembatalan DLS tidak memuat deskripsi", () => {
  const { judul, isi } = drcNotification("DIBATALKAN", activity);
  assert.match(judul, /^Kegiatan DLS Dibatalkan/);
  assert.doesNotMatch(isi, /Bawa alat tulis/);
});

test("notifikasi DLS dipotong sesuai batas kolom Pemberitahuan", () => {
  const { judul, isi } = drcNotification("BARU", {
    ...activity,
    judul: "J".repeat(200),
    deskripsi: "D".repeat(2000),
  });
  assert.equal(judul.length, 200);
  assert.equal(isi.length, 1000);
});

test("bukti DLS hanya bisa diunggah saat kegiatan berlangsung hingga 30 menit setelahnya (WITA)", () => {
  // Kegiatan 10 Nov 08:00–12:00 WITA = 00:00–04:00 UTC; ditutup 04:30 UTC.
  const at = (iso: string) => drcEvidenceStatus(activity, new Date(iso));
  assert.equal(at("2026-11-09T23:59:00.000Z"), "BELUM_DIBUKA");
  assert.equal(at("2026-11-10T00:00:00.000Z"), "DIBUKA");
  assert.equal(at("2026-11-10T04:00:00.000Z"), "DIBUKA");
  assert.equal(at("2026-11-10T04:30:00.000Z"), "DIBUKA");
  assert.equal(at("2026-11-10T04:31:00.000Z"), "DITUTUP");
});

test("kegiatan DLS dianggap selesai setelah waktu unggah bukti ditutup", () => {
  assert.equal(isDrcActivityPast(activity, new Date("2026-11-10T04:30:00.000Z")), false);
  assert.equal(isDrcActivityPast(activity, new Date("2026-11-10T04:31:00.000Z")), true);
});

test("validasi kegiatan DLS", () => {
  const parsed = parseBody(drcActivitySchema, validBody);
  assert.deepEqual(parsed?.tema, ["WAKTU", "AKADEMIK"]);
  assert.equal(parsed?.deskripsi, null);
  assert.equal(parseBody(drcActivitySchema, { ...validBody, jamSelesai: "07:00" }), null);
  assert.equal(parseBody(drcActivitySchema, { ...validBody, tema: [] }), null);
  assert.equal(parseBody(drcActivitySchema, { ...validBody, tanggal: "2026-02-30" }), null);
  assert.equal(parseBody(drcActivitySchema, { ...validBody, jamMulai: "8:00" }), null);
  assert.equal(parseBody(drcActivityUpdateSchema, validBody)?.beritahuMahasiswa, true);
});

test("target DLS kosong berarti semua prodi dan angkatan", () => {
  const everyone = { targetProdi: [], targetAngkatan: [] };
  assert.deepEqual(drcAngkatanWhere(everyone), {});
  assert.equal(describeDrcTarget(everyone), "Semua prodi; semua angkatan");
  assert.equal(isDrcTargetedTo(everyone, { jurusan: "Survei dan Pemetaan", angkatan: null }), true);
});

test("target DLS dicocokkan per prodi (tanpa beda huruf/spasi) dan angkatan", () => {
  const student = { jurusan: "  perawatan   MESIN ", angkatan: 2025 };
  assert.equal(isDrcTargetedTo(activity, student), true);
  assert.equal(isDrcTargetedTo(activity, { ...student, angkatan: 2024 }), false);
  assert.equal(isDrcTargetedTo(activity, { ...student, angkatan: null }), false);
  assert.equal(isDrcTargetedTo(activity, { ...student, jurusan: "Survei dan Pemetaan" }), false);
  assert.deepEqual(drcAngkatanWhere(activity), { angkatan: { in: [2026, 2025] } });
});

test("pilihan prodi DLS dari data mahasiswa", () => {
  assert.deepEqual(
    uniqueProdiOptions(["Survei dan Pemetaan", " survei  dan pemetaan ", "", "Perawatan Mesin"]),
    ["Perawatan Mesin", "Survei dan Pemetaan"],
  );
});

test("validasi target DLS", () => {
  const parsed = parseBody(drcActivitySchema, {
    ...validBody,
    targetProdi: ["Survei dan Pemetaan", "Survei dan Pemetaan"],
    targetAngkatan: [2026, 2024, 2026],
  });
  assert.deepEqual(parsed?.targetProdi, ["Survei dan Pemetaan"]);
  assert.deepEqual(parsed?.targetAngkatan, [2024, 2026]);
  assert.deepEqual(parseBody(drcActivitySchema, validBody)?.targetProdi, []);
  assert.equal(parseBody(drcActivitySchema, { ...validBody, targetProdi: ["  "] }), null);
  assert.equal(parseBody(drcActivitySchema, { ...validBody, targetAngkatan: [1999] }), null);
});
