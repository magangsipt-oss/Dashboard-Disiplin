import { randomBytes, scrypt, timingSafeEqual, createHash } from "node:crypto";
import { resolve } from "node:path";
import { promisify } from "node:util";
import dotenv from "dotenv";
import { Router, type Request, type Response } from "express";
import { Prisma, PrismaClient } from "@prisma/client";
import {
  calculatePointChange,
  getScorePredicate,
  pointChangeRules,
  type PointChangeAction,
} from "./points";

dotenv.config({ path: resolve(__dirname, "../.env") });

const scryptAsync = promisify(scrypt);
const database = new PrismaClient();
const SESSION_COOKIE = "sidisiplin_session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const SCRYPT_KEY_LENGTH = 64;
const MAX_POSTGRES_BIGINT = 9_223_372_036_854_775_807n;

export const authDatabases = [
  { name: "dashboard_disiplin", client: database },
];

type Role = "mhs" | "dosen" | "admin";

type UserProfile = {
  id: number;
  role: Role;
  roleLabel: string;
  name: string;
  identity: string;
  identityLabel: string;
  details: Array<{ label: string; value: string }>;
  createdAt: string;
};

type Account = {
  id: number;
  name: string;
  password: string;
  identity: string;
  identityLabel: string;
  role: Role;
  roleLabel: string;
  details: Array<{ label: string; value: string }>;
  createdAt: Date;
  updatePassword: (password: string) => Promise<unknown>;
};

type Session = {
  profile: UserProfile;
  expiresAt: number;
};

const sessions = new Map<string, Session>();

async function derivePassword(password: string, salt: Buffer): Promise<Buffer> {
  return (await scryptAsync(password, salt, SCRYPT_KEY_LENGTH)) as Buffer;
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derivedKey = await derivePassword(password, salt);
  return `scrypt$${salt.toString("base64url")}$${derivedKey.toString("base64url")}`;
}

async function verifyPassword(
  password: string,
  storedPassword: string,
): Promise<{ valid: boolean; needsUpgrade: boolean }> {
  if (storedPassword.startsWith("scrypt$")) {
    const [, encodedSalt, encodedKey] = storedPassword.split("$");
    if (!encodedSalt || !encodedKey) {
      return { valid: false, needsUpgrade: false };
    }

    const salt = Buffer.from(encodedSalt, "base64url");
    const expectedKey = Buffer.from(encodedKey, "base64url");
    if (salt.length !== 16 || expectedKey.length !== SCRYPT_KEY_LENGTH) {
      return { valid: false, needsUpgrade: false };
    }

    const actualKey = await derivePassword(password, salt);
    return {
      valid: timingSafeEqual(actualKey, expectedKey),
      needsUpgrade: false,
    };
  }

  const submittedDigest = createHash("sha256").update(password).digest();
  const storedDigest = createHash("sha256").update(storedPassword).digest();
  const valid = timingSafeEqual(submittedDigest, storedDigest);
  return { valid, needsUpgrade: valid };
}

function parseBigIntIdentity(value: string): bigint | null {
  if (!/^\d+$/.test(value)) {
    return null;
  }

  const identity = BigInt(value);
  return identity > 0n && identity <= MAX_POSTGRES_BIGINT ? identity : null;
}

async function findAccount(role: Role, identity: string): Promise<Account | null> {
  if (role === "mhs") {
    if (!/^\d+$/.test(identity)) {
      return null;
    }
    const nim = Number(identity);
    if (!Number.isSafeInteger(nim) || nim < 1 || nim > 2_147_483_647) {
      return null;
    }

    const account = await database.mahasiswa.findUnique({ where: { nim } });
    if (!account) {
      return null;
    }

    return {
      id: account.id,
      name: account.nama,
      password: account.password,
      identity: String(account.nim),
      identityLabel: "NIM",
      role,
      roleLabel: "Mahasiswa",
      details: [{ label: "Jurusan", value: account.jurusan }],
      createdAt: account.timestamp,
      updatePassword: (password) =>
        database.mahasiswa.update({
          where: { id: account.id },
          data: { password },
        }),
    };
  }

  const numericIdentity = parseBigIntIdentity(identity);
  if (numericIdentity === null) {
    return null;
  }

  if (role === "dosen") {
    const account = await database.dosen.findFirst({
      where: {
        OR: [{ nip: numericIdentity }, { nidn: numericIdentity }],
      },
    });
    if (!account) {
      return null;
    }

    const enteredNip = account.nip === numericIdentity;
    return {
      id: account.id,
      name: account.nama,
      password: account.password,
      identity: String(enteredNip ? account.nip : account.nidn),
      identityLabel: enteredNip ? "NIP" : "NIDN",
      role,
      roleLabel: "Dosen",
      details: [
        { label: "NIDN", value: String(account.nidn) },
        { label: "NIP", value: String(account.nip) },
      ],
      createdAt: account.timestamp,
      updatePassword: (password) =>
        database.dosen.update({
          where: { id: account.id },
          data: { password },
        }),
    };
  }

  const account = await database.kemahasiswaan.findUnique({
    where: { nip: numericIdentity },
  });
  if (!account) {
    return null;
  }

  return {
    id: account.id,
    name: account.nama,
    password: account.password,
    identity: String(account.nip),
    identityLabel: "NIP",
    role,
    roleLabel: "Kemahasiswaan",
    details: [{ label: "NIP", value: String(account.nip) }],
    createdAt: account.timestamp,
    updatePassword: (password) =>
      database.kemahasiswaan.update({
        where: { id: account.id },
        data: { password },
      }),
  };
}

function toProfile(account: Account): UserProfile {
  return {
    id: account.id,
    role: account.role,
    roleLabel: account.roleLabel,
    name: account.name,
    identity: account.identity,
    identityLabel: account.identityLabel,
    details: account.details,
    createdAt: account.createdAt.toISOString(),
  };
}

function readSessionToken(request: Request): string | null {
  const cookies = request.headers.cookie?.split(";") ?? [];
  for (const cookie of cookies) {
    const separatorIndex = cookie.indexOf("=");
    if (separatorIndex < 0) {
      continue;
    }
    if (cookie.slice(0, separatorIndex).trim() === SESSION_COOKIE) {
      return cookie.slice(separatorIndex + 1).trim() || null;
    }
  }
  return null;
}

function setSessionCookie(response: Response, token: string): void {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  response.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL_MS / 1000}${secure}`,
  );
}

function clearSessionCookie(response: Response): void {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  response.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`,
  );
}

export const authRouter = Router();

function getSessionForRequest(
  request: Request,
  response: Response,
): Session | null {
  const token = readSessionToken(request);
  const session = token ? sessions.get(token) : undefined;
  if (!session || session.expiresAt <= Date.now()) {
    if (token) {
      sessions.delete(token);
      clearSessionCookie(response);
    }
    return null;
  }
  return session;
}

authRouter.post("/login", async (request, response) => {
  const { role, identity, password } = request.body ?? {};
  if (
    !["mhs", "dosen", "admin"].includes(role) ||
    typeof identity !== "string" ||
    typeof password !== "string" ||
    identity.trim().length === 0 ||
    password.length === 0
  ) {
    response.status(400).json({ message: "Peran, identitas, dan kata sandi wajib diisi." });
    return;
  }

  try {
    const account = await findAccount(role as Role, identity.trim());
    if (!account) {
      response.status(401).json({ message: "Identitas atau kata sandi salah." });
      return;
    }

    const passwordResult = await verifyPassword(password, account.password);
    if (!passwordResult.valid) {
      response.status(401).json({ message: "Identitas atau kata sandi salah." });
      return;
    }
    if (passwordResult.needsUpgrade) {
      await account.updatePassword(await hashPassword(password));
    }

    const now = Date.now();
    for (const [token, session] of sessions) {
      if (session.expiresAt <= now) {
        sessions.delete(token);
      }
    }

    const token = randomBytes(32).toString("hex");
    const profile = toProfile(account);
    sessions.set(token, { profile, expiresAt: now + SESSION_TTL_MS });
    setSessionCookie(response, token);
    response.json({ profile });
  } catch (error) {
    console.error("Login gagal karena database atau proses autentikasi bermasalah:", error);
    response.status(503).json({ message: "Layanan login sedang tidak tersedia." });
  }
});

authRouter.get("/me", (request, response) => {
  const token = readSessionToken(request);
  const session = token ? sessions.get(token) : undefined;
  if (!token || !session || session.expiresAt <= Date.now()) {
    if (token) {
      sessions.delete(token);
    }
    clearSessionCookie(response);
    response.status(401).json({ message: "Sesi login tidak ditemukan atau sudah berakhir." });
    return;
  }

  response.json({ profile: session.profile });
});

authRouter.get("/advisors", async (request, response) => {
  const session = getSessionForRequest(request, response);
  if (!session) {
    response.status(401).json({ message: "Sesi login tidak ditemukan atau sudah berakhir." });
    return;
  }
  if (session.profile.role !== "mhs") {
    response.status(403).json({ message: "Daftar dosen PA hanya tersedia untuk akun mahasiswa." });
    return;
  }

  try {
    const advisors = await database.dosen.findMany({
      orderBy: { nama: "asc" },
      select: { id: true, nama: true },
    });
    response.json({ advisors });
  } catch (error) {
    console.error("Gagal memuat daftar dosen PA:", error);
    response.status(500).json({ message: "Daftar dosen PA gagal dimuat." });
  }
});

authRouter.get("/advisor", async (request, response) => {
  const session = getSessionForRequest(request, response);
  if (!session) {
    response.status(401).json({ message: "Sesi login tidak ditemukan atau sudah berakhir." });
    return;
  }
  if (session.profile.role !== "mhs") {
    response.status(403).json({ message: "Pilihan dosen PA hanya tersedia untuk akun mahasiswa." });
    return;
  }

  try {
    const student = await database.mahasiswa.findUnique({
      where: { id: session.profile.id },
      select: {
        dosenPa: { select: { id: true, nama: true } },
        advisorRequest: {
          select: {
            id: true,
            dosenId: true,
            status: true,
            dosen: { select: { id: true, nama: true } },
          },
        },
      },
    });
    if (!student) {
      response.status(404).json({ message: "Data mahasiswa tidak ditemukan." });
      return;
    }
    response.json({ advisor: student.dosenPa, request: student.advisorRequest });
  } catch (error) {
    console.error("Gagal memuat dosen PA mahasiswa:", error);
    response.status(500).json({ message: "Pilihan dosen PA gagal dimuat." });
  }
});

authRouter.get("/advisor-requests", async (request, response) => {
  const session = getSessionForRequest(request, response);
  if (!session) {
    response.status(401).json({ message: "Sesi login tidak ditemukan atau sudah berakhir." });
    return;
  }
  if (session.profile.role !== "dosen") {
    response.status(403).json({ message: "Hanya akun dosen yang dapat melihat permohonan PA." });
    return;
  }

  try {
    const requests = await database.advisorRequest.findMany({
      where: { dosenId: session.profile.id, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      include: {
        student: { select: { id: true, nim: true, nama: true, jurusan: true } },
      },
    });
    response.json({ requests });
  } catch (error) {
    console.error("Gagal memuat permohonan dosen PA:", error);
    response.status(500).json({ message: "Permohonan PA gagal dimuat." });
  }
});

authRouter.post("/advisor/request", async (request, response) => {
  const session = getSessionForRequest(request, response);
  if (!session) {
    response.status(401).json({ message: "Sesi login tidak ditemukan atau sudah berakhir." });
    return;
  }
  if (session.profile.role !== "mhs") {
    response.status(403).json({ message: "Hanya mahasiswa yang dapat mengajukan dosen PA." });
    return;
  }

  const dosenId = request.body?.dosenId;
  if (typeof dosenId !== "number" || !Number.isSafeInteger(dosenId) || dosenId < 1) {
    response.status(400).json({ message: "Pilih dosen PA yang valid." });
    return;
  }

  try {
    const advisor = await database.dosen.findUnique({
      where: { id: dosenId },
      select: { id: true },
    });
    if (!advisor) {
      response.status(404).json({ message: "Dosen PA tidak ditemukan." });
      return;
    }

    const advisorRequest = await database.advisorRequest.upsert({
      where: { studentId: session.profile.id },
      create: { studentId: session.profile.id, dosenId: advisor.id },
      update: { dosenId: advisor.id, status: "PENDING", reviewedAt: null },
      include: { dosen: { select: { id: true, nama: true } } },
    });
    response.json({ request: advisorRequest });
  } catch (error) {
    console.error("Gagal mengirim permohonan dosen PA:", error);
    response.status(500).json({ message: "Permohonan dosen PA gagal dikirim." });
  }
});

authRouter.patch("/advisor-requests/:requestId", async (request, response) => {
  const session = getSessionForRequest(request, response);
  if (!session) {
    response.status(401).json({ message: "Sesi login tidak ditemukan atau sudah berakhir." });
    return;
  }
  if (session.profile.role !== "dosen") {
    response.status(403).json({ message: "Hanya dosen yang dapat memutuskan permohonan PA." });
    return;
  }

  const requestId = Number(request.params.requestId);
  const decision = request.body?.decision;
  if (!Number.isSafeInteger(requestId) || requestId < 1 || !["approved", "rejected"].includes(decision)) {
    response.status(400).json({ message: "ID permohonan atau keputusan tidak valid." });
    return;
  }

  try {
    const result = await database.$transaction(async (transaction) => {
      const pendingRequest = await transaction.advisorRequest.findFirst({
        where: { id: requestId, dosenId: session.profile.id, status: "PENDING" },
        select: { id: true, studentId: true, dosenId: true },
      });
      if (!pendingRequest) {
        return null;
      }

      const status = decision === "approved" ? "APPROVED" : "REJECTED";
      const updated = await transaction.advisorRequest.updateMany({
        where: { id: requestId, dosenId: session.profile.id, status: "PENDING" },
        data: { status, reviewedAt: new Date() },
      });
      if (updated.count !== 1) {
        return null;
      }
      if (status === "APPROVED") {
        await transaction.mahasiswa.update({
          where: { id: pendingRequest.studentId },
          data: { dosenPaId: pendingRequest.dosenId },
        });
      }

      return transaction.advisorRequest.findUnique({
        where: { id: requestId },
        include: {
          dosen: { select: { id: true, nama: true } },
          student: { select: { id: true, nim: true, nama: true, jurusan: true } },
        },
      });
    });

    if (!result) {
      response.status(404).json({ message: "Permohonan tidak ditemukan atau sudah diproses." });
      return;
    }
    response.json({ request: result });
  } catch (error) {
    console.error("Gagal memutuskan permohonan dosen PA:", error);
    response.status(500).json({ message: "Keputusan permohonan gagal disimpan." });
  }
});

authRouter.get("/counseling", async (request, response) => {
  const session = getSessionForRequest(request, response);
  if (!session) {
    response.status(401).json({ message: "Sesi login tidak ditemukan atau sudah berakhir." });
    return;
  }
  if (session.profile.role !== "mhs" && session.profile.role !== "dosen") {
    response.status(403).json({ message: "Catatan konseling hanya tersedia untuk mahasiswa dan dosen PA." });
    return;
  }

  try {
    if (session.profile.role === "mhs") {
      const records = await database.counselingRecord.findMany({
        where: { studentId: session.profile.id },
        orderBy: [{ counselingDate: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          type: true,
          note: true,
          counselingDate: true,
          createdAt: true,
          dosen: { select: { nama: true } },
        },
      });
      response.json({ records });
      return;
    }

    const students = await database.mahasiswa.findMany({
      where: { dosenPaId: session.profile.id },
      orderBy: { nama: "asc" },
      select: {
        id: true,
        nim: true,
        nama: true,
        jurusan: true,
        pointScore: true,
        pointChanges: {
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            type: true,
            delta: true,
            scoreAfter: true,
            reason: true,
            createdAt: true,
          },
        },
        counselingRecords: {
          orderBy: [{ counselingDate: "desc" }, { createdAt: "desc" }],
          select: {
            id: true,
            type: true,
            note: true,
            counselingDate: true,
            createdAt: true,
          },
        },
      },
    });
    response.json({ students });
  } catch (error) {
    console.error("Gagal memuat data konseling:", error);
    response.status(500).json({ message: "Data konseling gagal dimuat." });
  }
});

authRouter.post("/counseling", async (request, response) => {
  const session = getSessionForRequest(request, response);
  if (!session) {
    response.status(401).json({ message: "Sesi login tidak ditemukan atau sudah berakhir." });
    return;
  }
  if (session.profile.role !== "dosen") {
    response.status(403).json({ message: "Hanya dosen PA yang dapat mencatat pembinaan dan panggilan konseling." });
    return;
  }

  const { studentId, type, note, counselingDate } = request.body ?? {};
  if (
    typeof studentId !== "number" ||
    !Number.isSafeInteger(studentId) ||
    studentId < 1 ||
    !["GUIDANCE_NOTE", "COUNSELING_CALL"].includes(type) ||
    typeof note !== "string" ||
    note.trim().length === 0 ||
    note.trim().length > 2000 ||
    typeof counselingDate !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(counselingDate) ||
    Number.isNaN(Date.parse(`${counselingDate}T00:00:00.000Z`)) ||
    new Date(`${counselingDate}T00:00:00.000Z`).toISOString().slice(0, 10) !== counselingDate
  ) {
    response.status(400).json({ message: "Mahasiswa, jenis catatan, isi catatan, dan tanggal konseling wajib diisi dengan benar." });
    return;
  }

  try {
    const student = await database.mahasiswa.findFirst({
      where: { id: studentId, dosenPaId: session.profile.id },
      select: { id: true },
    });
    if (!student) {
      response.status(404).json({ message: "Mahasiswa bukan bagian dari bimbingan dosen ini." });
      return;
    }

    const record = await database.counselingRecord.create({
      data: {
        studentId,
        dosenId: session.profile.id,
        type,
        note: note.trim(),
        counselingDate: new Date(`${counselingDate}T00:00:00.000Z`),
      },
      select: {
        id: true,
        type: true,
        note: true,
        counselingDate: true,
        createdAt: true,
        dosen: { select: { nama: true } },
      },
    });
    response.status(201).json({ record });
  } catch (error) {
    console.error("Gagal menyimpan catatan konseling:", error);
    response.status(500).json({ message: "Catatan konseling gagal disimpan." });
  }
});

authRouter.get("/points", async (request, response) => {
  const session = getSessionForRequest(request, response);
  if (!session) {
    response.status(401).json({ message: "Sesi login tidak ditemukan atau sudah berakhir." });
    return;
  }
  if (session.profile.role !== "mhs") {
    response.status(403).json({ message: "Data poin hanya tersedia untuk akun mahasiswa." });
    return;
  }

  try {
    const [student, activityTotals] = await Promise.all([
      database.mahasiswa.findUnique({
        where: { id: session.profile.id },
        select: {
          pointScore: true,
          pointChanges: {
            orderBy: { createdAt: "desc" },
            take: 50,
            select: {
              id: true,
              type: true,
              delta: true,
              scoreAfter: true,
              reason: true,
              createdAt: true,
            },
          },
        },
      }),
      database.pointChange.aggregate({
        where: {
          studentId: session.profile.id,
          type: { in: ["COMPETITION", "NON_ACADEMIC_ACTIVITY"] },
        },
        _sum: { delta: true },
        _count: { _all: true },
      }),
    ]);
    if (!student) {
      response.status(404).json({ message: "Data mahasiswa tidak ditemukan." });
      return;
    }

    response.json({
      score: student.pointScore,
      predicate: getScorePredicate(student.pointScore),
      activityPoints: activityTotals._sum.delta ?? 0,
      verifiedActivityCount: activityTotals._count._all,
      changes: student.pointChanges,
    });
  } catch (error) {
    console.error("Gagal memuat poin mahasiswa:", error);
    response.status(500).json({ message: "Data poin mahasiswa gagal dimuat." });
  }
});

authRouter.post("/points/adjust", async (request, response) => {
  const session = getSessionForRequest(request, response);
  if (!session) {
    response.status(401).json({ message: "Sesi login tidak ditemukan atau sudah berakhir." });
    return;
  }
  if (session.profile.role !== "admin") {
    response.status(403).json({ message: "Hanya admin kemahasiswaan yang dapat mencatat perubahan poin." });
    return;
  }

  const { nim, type, reason } = request.body ?? {};
  if (
    typeof nim !== "string" ||
    !/^\d+$/.test(nim) ||
    !Number.isSafeInteger(Number(nim)) ||
    Number(nim) < 1 ||
    Number(nim) > 2_147_483_647 ||
    typeof type !== "string" ||
    !Object.prototype.hasOwnProperty.call(pointChangeRules, type) ||
    typeof reason !== "string" ||
    reason.trim().length === 0 ||
    reason.trim().length > 500
  ) {
    response.status(400).json({
      message: "NIM, jenis perubahan poin, dan catatan wajib diisi dengan benar.",
    });
    return;
  }

  const action = type as PointChangeAction;
  const rule = pointChangeRules[action];
  try {
    const result = await database.$transaction(
      async (transaction) => {
        const student = await transaction.mahasiswa.findUnique({
          where: { nim: Number(nim) },
          select: { id: true, nim: true, nama: true, pointScore: true },
        });
        if (!student) {
          return null;
        }

        const { score, delta: appliedDelta } = calculatePointChange(
          student.pointScore,
          action,
        );
        await transaction.mahasiswa.update({
          where: { id: student.id },
          data: { pointScore: score },
        });
        await transaction.pointChange.create({
          data: {
            studentId: student.id,
            type: rule.type,
            delta: appliedDelta,
            scoreAfter: score,
            reason: reason.trim(),
            recordedByIdentity: session.profile.identity,
          },
        });

        return { student, score, appliedDelta };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    if (!result) {
      response.status(404).json({ message: "Mahasiswa dengan NIM tersebut tidak ditemukan." });
      return;
    }

    response.json({
      nim: result.student.nim,
      name: result.student.nama,
      score: result.score,
      delta: result.appliedDelta,
      predicate: getScorePredicate(result.score),
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      response.status(409).json({
        message: "Perubahan poin bersamaan terdeteksi. Silakan ulangi pencatatan.",
      });
      return;
    }
    console.error("Gagal mencatat perubahan poin mahasiswa:", error);
    response.status(500).json({ message: "Perubahan poin gagal disimpan." });
  }
});

authRouter.post("/logout", (request, response) => {
  const token = readSessionToken(request);
  if (token) {
    sessions.delete(token);
  }
  clearSessionCookie(response);
  response.status(204).end();
});
