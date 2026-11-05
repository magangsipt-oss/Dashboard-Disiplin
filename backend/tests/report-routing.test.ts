import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "@prisma/client";
import {
  buildReportNotificationTexts,
  createReportNotifications,
  isValidNimFormat,
  matchReportedStudent,
  normalizeName,
  parseNim,
  resolveReportRoute,
  type ReportRoute,
} from "../src/report-routing";

const reportDetails = {
  pillar: "WAKTU" as const,
  tanggalKejadian: new Date("2026-10-21T00:00:00.000Z"),
};

function makeStudent(dosenPaId: number | null = 17) {
  return { id: 3, nama: "Andi Pratama", nim: 23409901, dosenPaId };
}

function makeDatabase(student: ReturnType<typeof makeStudent> | null) {
  let queryCount = 0;
  const db = {
    mahasiswa: {
      findUnique: async () => {
        queryCount += 1;
        return student;
      },
    },
  };
  return {
    db: db as unknown as Prisma.TransactionClient,
    queryCount: () => queryCount,
  };
}

function makeNotificationTransaction() {
  const calls: Array<{ model: string; data: Record<string, unknown> }> = [];
  const tx = {
    pemberitahuan: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        calls.push({ model: "pemberitahuan", data });
      },
    },
    pemberitahuanStaf: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        calls.push({ model: "pemberitahuanStaf", data });
      },
    },
  };
  return { tx: tx as unknown as Prisma.TransactionClient, calls };
}

function makeTexts(
  route: ReportRoute,
  overrides: Partial<Parameters<typeof buildReportNotificationTexts>[0]> = {},
) {
  return buildReportNotificationTexts({
    ...reportDetails,
    route,
    terlaporNama: "Nama Uji",
    terlaporNim: "12345678",
    ...overrides,
  });
}

test("normalizeName mengabaikan kapital, spasi, tanda baca, dan aksen tanpa mengabaikan kata", () => {
  assert.equal(normalizeName("  ÁNDI   Pratama! "), "andi pratama");
  assert.equal(normalizeName("Andi"), "andi");
  assert.notEqual(normalizeName("Andi"), normalizeName("Andi Pratama"));
});

test("validasi format NIM dan batas integer PostgreSQL", () => {
  assert.equal(isValidNimFormat("23409901"), true);
  assert.equal(isValidNimFormat("123"), false);
  assert.equal(isValidNimFormat("1234567890123456"), false);
  assert.equal(isValidNimFormat("1234A678"), false);
  assert.equal(parseNim("23409901"), 23409901);
  assert.equal(parseNim("2204101001"), null);
  assert.equal(parseNim("123"), null);
});

test("mode tidak diketahui tidak melakukan pencarian mahasiswa", async () => {
  const { db, queryCount } = makeDatabase(makeStudent());
  assert.deepEqual(
    await resolveReportRoute(db, { diketahui: false, nama: "", nim: "" }),
    { jalur: "TIDAK_DIKETAHUI" },
  );
  assert.equal(queryCount(), 0);
});

test("NIM dan nama yang cocok menghasilkan jalur teridentifikasi", async () => {
  const { db, queryCount } = makeDatabase(makeStudent());
  assert.deepEqual(
    await resolveReportRoute(db, {
      diketahui: true,
      nama: "  ándi  PRATAMA ",
      nim: "23409901",
    }),
    { jalur: "TERIDENTIFIKASI", student: makeStudent() },
  );
  assert.equal(queryCount(), 1);
});

test("nama berbeda, NIM tidak ditemukan, dan NIM di luar int32 tidak terdaftar", async () => {
  const matchingNimDb = makeDatabase(makeStudent());
  assert.deepEqual(
    await resolveReportRoute(matchingNimDb.db, {
      diketahui: true,
      nama: "Andi",
      nim: "23409901",
    }),
    { jalur: "TIDAK_TERDAFTAR" },
  );

  const missingStudentDb = makeDatabase(null);
  assert.deepEqual(
    await resolveReportRoute(missingStudentDb.db, {
      diketahui: true,
      nama: "Andi Pratama",
      nim: "23409901",
    }),
    { jalur: "TIDAK_TERDAFTAR" },
  );

  const tooLargeNimDb = makeDatabase(makeStudent());
  assert.deepEqual(
    await resolveReportRoute(tooLargeNimDb.db, {
      diketahui: true,
      nama: "Andi Pratama",
      nim: "2204101001",
    }),
    { jalur: "TIDAK_TERDAFTAR" },
  );
  assert.equal(tooLargeNimDb.queryCount(), 0);
});

const students = [
  { id: 1, nama: "Abin Nabawi", nim: 23400001, dosenPaId: 17 },
  { id: 2, nama: "Muhammad Abin", nim: 23400002, dosenPaId: 17 },
  { id: 3, nama: "Hasan Abin", nim: 23400003, dosenPaId: null },
  { id: 4, nama: "Sabina Putri", nim: 23400004, dosenPaId: 17 },
  { id: 5, nama: "Rizky Pratama", nim: 23400005, dosenPaId: 17 },
];

// Meniru findUnique per NIM dan findMany dengan filter `contains` insensitive.
function makeStudentsDatabase(rows: typeof students) {
  const db = {
    mahasiswa: {
      findUnique: async ({ where }: { where: { nim: number } }) =>
        rows.find((row) => row.nim === where.nim) ?? null,
      findMany: async ({ where }: { where: { AND: Array<{ nama: { contains: string } }> } }) =>
        rows.filter((row) =>
          where.AND.every((filter) => row.nama.toLowerCase().includes(filter.nama.contains)),
        ),
    },
  };
  return db as unknown as Prisma.TransactionClient;
}

async function match(nama: string, nim = "", rows = students) {
  return matchReportedStudent(makeStudentsDatabase(rows), { diketahui: true, nama, nim });
}

function identifiedId(route: ReportRoute) {
  return route.jalur === "TERIDENTIFIKASI" ? route.student.id : null;
}

test("pencocokan pelapor: nama panggilan unik tanpa NIM teridentifikasi, kapital diabaikan", async () => {
  assert.equal(identifiedId(await match("RIZKY")), 5);
  assert.equal(identifiedId(await match("rizky pratama")), 5);
  // "sabina" tidak dianggap cocok dengan "abin" karena bukan kata utuh.
  assert.equal(identifiedId(await match("sabina")), 4);
});

test("pencocokan pelapor: nama panggilan yang dimiliki banyak mahasiswa ke Kemahasiswaan", async () => {
  assert.deepEqual(await match("abin"), { jalur: "TIDAK_TERDAFTAR" });
  assert.deepEqual(await match("budi"), { jalur: "TIDAK_TERDAFTAR" });
});

test("pencocokan pelapor: nama lengkap persis diutamakan", async () => {
  const rows = [...students, { id: 6, nama: "Abin Nabawi Putra", nim: 23400006, dosenPaId: 17 }];
  assert.equal(identifiedId(await match("Abin Nabawi", "", rows)), 1);
});

test("pencocokan pelapor: nama benar NIM salah, atau NIM benar nama salah, tetap teridentifikasi", async () => {
  assert.equal(identifiedId(await match("Rizky Pratama", "99999999")), 5);
  assert.equal(identifiedId(await match("Rizki", "23400005")), 5);
  // NIM memperjelas nama panggilan yang ganda.
  assert.equal(identifiedId(await match("abin", "23400002")), 2);
});

test("pencocokan pelapor: NIM dan nama menunjuk mahasiswa berbeda ke Kemahasiswaan", async () => {
  assert.deepEqual(await match("Rizky", "23400001"), { jalur: "TIDAK_TERDAFTAR" });
});

test("laporan temuan teridentifikasi memberi notifikasi mahasiswa, DPA, dan Kemahasiswaan", async () => {
  const route: ReportRoute = { jalur: "TERIDENTIFIKASI", student: makeStudent() };
  const { tx, calls } = makeNotificationTransaction();
  await createReportNotifications(tx, {
    laporanId: 41,
    route,
    texts: makeTexts(route),
  });
  assert.equal(calls.length, 3);
  assert.equal(calls.filter((call) => call.model === "pemberitahuan").length, 1);
  assert.equal(calls.filter((call) => call.model === "pemberitahuanStaf").length, 2);
  assert.ok(calls.some((call) => call.data.peran === "DOSEN"));
  assert.ok(calls.some((call) => call.data.peran === "KEMAHASISWAAN"));
  for (const call of calls.filter((item) => item.model === "pemberitahuan" || item.data.peran === "DOSEN")) {
    assert.doesNotMatch(String(call.data.isi), /lokasi|pelapor/i);
  }
});

test("laporan teridentifikasi tanpa DPA membuat dua notifikasi dan menjelaskan status DPA", async () => {
  const route: ReportRoute = { jalur: "TERIDENTIFIKASI", student: makeStudent(null) };
  const { tx, calls } = makeNotificationTransaction();
  const texts = makeTexts(route);
  await createReportNotifications(tx, { laporanId: 42, route, texts });
  assert.equal(calls.length, 2);
  assert.match(texts.kemahasiswaan?.isi ?? "", /Dosen PA belum ditetapkan/);
  assert.equal(texts.dosen, null);
});

test("laporan yang tidak terdaftar atau tidak diketahui hanya memberi notifikasi penelusuran", async () => {
  for (const route of [
    { jalur: "TIDAK_TERDAFTAR" },
    { jalur: "TIDAK_DIKETAHUI" },
  ] satisfies ReportRoute[]) {
    const { tx, calls } = makeNotificationTransaction();
    const texts = makeTexts(route);
    await createReportNotifications(tx, { laporanId: 43, route, texts });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].data.peran, "KEMAHASISWAAN");
    assert.match(texts.kemahasiswaan?.isi ?? "", /Perlu ditelusuri/);
  }
});
