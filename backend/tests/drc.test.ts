import assert from "node:assert/strict";
import test from "node:test";
import {
  canSubmitDrcEvidence,
  describeDrcTarget,
  drcNotification,
  drcAngkatanWhere,
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

test("notifikasi DRC baru memuat jadwal, tema, dan status wajib", () => {
  const { judul, isi } = drcNotification("BARU", activity);
  assert.equal(judul, "Kegiatan DRC Wajib: Seminar Refreshment Kedisiplinan Mahasiswa");
  assert.match(isi, /WAJIB Anda ikuti/);
  assert.match(isi, /Peserta  : Prodi Perawatan Mesin; angkatan 2025, 2026/);
  assert.match(isi, /Selasa, 10 November 2026/);
  assert.match(isi, /08:00–12:00 WITA/);
  assert.match(isi, /Disiplin Waktu, Disiplin Lingkungan/);
  assert.match(isi, /Bawa alat tulis\./);
});

test("notifikasi pembatalan DRC tidak memuat deskripsi", () => {
  const { judul, isi } = drcNotification("DIBATALKAN", activity);
  assert.match(judul, /^Kegiatan DRC Dibatalkan/);
  assert.doesNotMatch(isi, /Bawa alat tulis/);
});

test("notifikasi DRC dipotong sesuai batas kolom Pemberitahuan", () => {
  const { judul, isi } = drcNotification("BARU", {
    ...activity,
    judul: "J".repeat(200),
    deskripsi: "D".repeat(2000),
  });
  assert.equal(judul.length, 200);
  assert.equal(isi.length, 1000);
});

test("kegiatan DRC dianggap lewat setelah hari kegiatannya berakhir (WITA)", () => {
  // 10 Nov 23:30 WITA masih hari kegiatan; 11 Nov 00:30 WITA sudah lewat.
  assert.equal(isDrcActivityPast(activity.tanggal, new Date("2026-11-10T15:30:00.000Z")), false);
  assert.equal(isDrcActivityPast(activity.tanggal, new Date("2026-11-10T16:30:00.000Z")), true);
});

test("bukti DRC bisa diunggah mulai hari pelaksanaan (WITA)", () => {
  // 2026-11-09 16:30 UTC = 2026-11-10 00:30 WITA.
  assert.equal(canSubmitDrcEvidence(activity.tanggal, new Date("2026-11-09T15:30:00.000Z")), false);
  assert.equal(canSubmitDrcEvidence(activity.tanggal, new Date("2026-11-09T16:30:00.000Z")), true);
  assert.equal(canSubmitDrcEvidence(activity.tanggal, new Date("2026-11-20T00:00:00.000Z")), true);
});

test("validasi kegiatan DRC", () => {
  const parsed = parseBody(drcActivitySchema, validBody);
  assert.deepEqual(parsed?.tema, ["WAKTU", "AKADEMIK"]);
  assert.equal(parsed?.deskripsi, null);
  assert.equal(parseBody(drcActivitySchema, { ...validBody, jamSelesai: "07:00" }), null);
  assert.equal(parseBody(drcActivitySchema, { ...validBody, tema: [] }), null);
  assert.equal(parseBody(drcActivitySchema, { ...validBody, tanggal: "2026-02-30" }), null);
  assert.equal(parseBody(drcActivitySchema, { ...validBody, jamMulai: "8:00" }), null);
  assert.equal(parseBody(drcActivityUpdateSchema, validBody)?.beritahuMahasiswa, true);
});

test("target DRC kosong berarti semua prodi dan angkatan", () => {
  const everyone = { targetProdi: [], targetAngkatan: [] };
  assert.deepEqual(drcAngkatanWhere(everyone), {});
  assert.equal(describeDrcTarget(everyone), "Semua prodi; semua angkatan");
  assert.equal(isDrcTargetedTo(everyone, { jurusan: "Survei dan Pemetaan", angkatan: null }), true);
});

test("target DRC dicocokkan per prodi (tanpa beda huruf/spasi) dan angkatan", () => {
  const student = { jurusan: "  perawatan   MESIN ", angkatan: 2025 };
  assert.equal(isDrcTargetedTo(activity, student), true);
  assert.equal(isDrcTargetedTo(activity, { ...student, angkatan: 2024 }), false);
  assert.equal(isDrcTargetedTo(activity, { ...student, angkatan: null }), false);
  assert.equal(isDrcTargetedTo(activity, { ...student, jurusan: "Survei dan Pemetaan" }), false);
  assert.deepEqual(drcAngkatanWhere(activity), { angkatan: { in: [2026, 2025] } });
});

test("pilihan prodi DRC dari data mahasiswa", () => {
  assert.deepEqual(
    uniqueProdiOptions(["Survei dan Pemetaan", " survei  dan pemetaan ", "", "Perawatan Mesin"]),
    ["Perawatan Mesin", "Survei dan Pemetaan"],
  );
});

test("validasi target DRC", () => {
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
