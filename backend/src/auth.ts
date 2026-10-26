import { randomBytes, createHash } from "node:crypto";
import { Router, type NextFunction, type Request, type Response } from "express";
import { Prisma } from "@prisma/client";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import {
  calculatePointChange,
  disciplinePillarLabels,
  getPointChangeMetadata,
  getScorePredicate,
  pointChangeRules,
  violationSeverityFollowUps,
  type DisciplinePillar,
  type ViolationSeverity,
  type PointChangeAction,
} from "./points";
import { verifyPassword } from "./password";
import { counselingSchema, loginSchema, parseBody } from "./validation";


import { database } from "./db";
export { database };
const SESSION_COOKIE = "sidisiplin_session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
export const authDatabases = [
  { name: "dashboard_disiplin", client: database },
];

export type Role = "mhs" | "dosen" | "admin" | "akademik";

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
};

export type Session = {
  profile: UserProfile;
  expiresAt: number;
};

function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function createSession(profile: UserProfile): Promise<string> {
  const now = Date.now();
  // Bersihkan sesi kedaluwarsa sesekali agar tabel tidak menumpuk.
  if (Math.random() < 0.05) {
    await database.sesi.deleteMany({ where: { expiresAt: { lte: new Date(now) } } });
  }
  const token = randomBytes(32).toString("hex");
  await database.sesi.create({
    data: {
      tokenHash: hashSessionToken(token),
      profile: profile as unknown as Prisma.InputJsonValue,
      expiresAt: new Date(now + SESSION_TTL_MS),
    },
  });
  return token;
}

async function deleteSession(token: string): Promise<void> {
  await database.sesi.deleteMany({ where: { tokenHash: hashSessionToken(token) } });
}

// Dipasang sekali di app: memuat sesi dari DB ke response.locals.
export async function loadSession(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const token = readSessionToken(request);
  if (!token) {
    next();
    return;
  }
  try {
    const row = await database.sesi.findUnique({
      where: { tokenHash: hashSessionToken(token) },
    });
    if (row && row.expiresAt.getTime() > Date.now()) {
      response.locals.session = {
        profile: row.profile as unknown as UserProfile,
        expiresAt: row.expiresAt.getTime(),
      } satisfies Session;
    } else {
      if (row) await deleteSession(token);
      clearSessionCookie(response);
    }
    next();
  } catch (error) {
    next(error);
  }
}

type EmailLoginAccount = {
  id: number;
  email: string | null;
  name: string;
  password: string;
  timestamp: Date;
};

async function findEmailLoginAccount(
  table: "Dosen" | "Akademik" | "Kemahasiswaan",
  identity: string,
): Promise<EmailLoginAccount | null> {
  const accounts = await database.$queryRaw<EmailLoginAccount[]>(
    Prisma.sql`SELECT
      "ID" AS "id",
      "Email" AS "email",
      "Nama" AS "name",
      "Password" AS "password",
      "Timestamp" AS "timestamp"
    FROM public.${Prisma.raw(`"${table}"`)}
    WHERE "Email" IS NOT NULL
      AND btrim("Email") <> ''
      AND lower(btrim("Email")) = lower(btrim(${identity}))
    LIMIT 2`,
  );

  if (accounts.length > 1) {
    throw new Error(`Email login tidak unik pada tabel "${table}".`);
  }

  return accounts[0] ?? null;
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
    };
  }

  const table =
    role === "dosen"
      ? "Dosen"
      : role === "admin"
        ? "Kemahasiswaan"
        : "Akademik";
  const account = await findEmailLoginAccount(table, identity);
  if (!account?.email) {
    return null;
  }

  const roleLabels: Record<"dosen" | "admin" | "akademik", string> = {
    dosen: "Dosen",
    admin: "Kemahasiswaan",
    akademik: "Akademik",
  };
  return {
    id: account.id,
    name: account.name,
    password: account.password,
    identity: account.email,
    identityLabel: "Email",
    role,
    roleLabel: roleLabels[role],
    details: [{ label: "Email", value: account.email }],
    createdAt: account.timestamp,
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

export function getSessionForRequest(
  _request: Request,
  response: Response,
): Session | null {
  const session = response.locals.session as Session | undefined;
  if (!session || session.expiresAt <= Date.now()) {
    return null;
  }
  return session;
}

const SESSION_MISSING_MESSAGE = "Sesi login tidak ditemukan atau sudah berakhir.";

// Middleware: tolak jika belum login (401) atau peran tidak cocok (403).
export function requireRole(roles: Role[], forbiddenMessage: string) {
  return (request: Request, response: Response, next: NextFunction): void => {
    const session = getSessionForRequest(request, response);
    if (!session) {
      response.status(401).json({ message: SESSION_MISSING_MESSAGE });
      return;
    }
    if (!roles.includes(session.profile.role)) {
      response.status(403).json({ message: forbiddenMessage });
      return;
    }
    next();
  };
}

// Dipakai setelah requireRole, jadi sesi pasti ada.
export function currentSession(response: Response): Session {
  return response.locals.session as Session;
}

// Hanya percobaan gagal yang dihitung. Kunci per IP + identitas agar satu
// NAT kampus tidak saling mengunci, plus batas longgar per IP.
const loginFailureLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  keyGenerator: (request) => {
    const identity =
      typeof request.body?.identity === "string"
        ? request.body.identity.trim().toLowerCase()
        : "";
    return `${ipKeyGenerator(request.ip ?? "")}:${identity}`;
  },
  message: { message: "Terlalu banyak percobaan login gagal. Coba lagi dalam 15 menit." },
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

const loginIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  skipSuccessfulRequests: true,
  message: { message: "Terlalu banyak percobaan login dari jaringan ini. Coba lagi nanti." },
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

authRouter.post("/login", loginIpLimiter, loginFailureLimiter, async (request, response) => {
  const credentials = parseBody(loginSchema, request.body);
  if (!credentials) {
    response.status(400).json({ message: "Peran, identitas, dan kata sandi wajib diisi." });
    return;
  }
  const { role, identity, password } = credentials;

  try {
    const account = await findAccount(role, identity);
    if (!account) {
      response.status(401).json({ message: "Identitas atau kata sandi salah." });
      return;
    }

    if (!(await verifyPassword(password, account.password))) {
      response.status(401).json({ message: "Identitas atau kata sandi salah." });
      return;
    }

    const profile = toProfile(account);
    const token = await createSession(profile);
    setSessionCookie(response, token);
    response.json({ profile });
  } catch (error) {
    console.error("Login gagal karena database atau proses autentikasi bermasalah:", error);
    response.status(503).json({ message: "Layanan login sedang tidak tersedia." });
  }
});

authRouter.get("/me", (request, response) => {
  const session = getSessionForRequest(request, response);
  if (!session) {
    clearSessionCookie(response);
    response.status(401).json({ message: "Sesi login tidak ditemukan atau sudah berakhir." });
    return;
  }

  response.json({ profile: session.profile });
});

authRouter.get("/advisors", requireRole(["mhs"], "Daftar dosen PA hanya tersedia untuk akun mahasiswa."), async (request, response) => {

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

authRouter.get("/advisor", requireRole(["mhs"], "Data dosen PA hanya tersedia untuk akun mahasiswa."), async (request, response) => {
  const session = currentSession(response);

  try {
    const student = await database.mahasiswa.findUnique({
      where: { id: session.profile.id },
      select: {
        dosenPa: { select: { id: true, nama: true } },
      },
    });
    if (!student) {
      response.status(404).json({ message: "Data mahasiswa tidak ditemukan." });
      return;
    }
    response.json({ advisor: student.dosenPa });
  } catch (error) {
    console.error("Gagal memuat dosen PA mahasiswa:", error);
    response.status(500).json({ message: "Pilihan dosen PA gagal dimuat." });
  }
});

authRouter.get("/advisor/students", requireRole(["dosen"], "Hanya akun dosen yang dapat melihat mahasiswa bimbingan."), async (request, response) => {
  const session = currentSession(response);

  try {
    const students = await database.mahasiswa.findMany({
      where: { dosenPaId: session.profile.id },
      orderBy: { nama: "asc" },
      select: {
        id: true,
        nim: true,
        nama: true,
        jurusan: true,
        pointScore: true,
      },
    });
    response.json({ students });
  } catch (error) {
    console.error("Gagal memuat daftar mahasiswa bimbingan:", error);
    response.status(500).json({ message: "Daftar mahasiswa bimbingan gagal dimuat." });
  }
});

authRouter.get("/admin/monitoring", requireRole(["admin"], "Hanya admin kemahasiswaan yang dapat melihat monitoring seluruh mahasiswa dan dosen."), async (request, response) => {

  try {
    const [students, lecturers] = await Promise.all([
      database.mahasiswa.findMany({
        orderBy: { nama: "asc" },
        select: {
          id: true,
          nim: true,
          nama: true,
          jurusan: true,
          pointScore: true,
          dosenPa: {
            select: { id: true, nuptk: true, nama: true },
          },
          counselingRecords: {
            orderBy: [{ counselingDate: "desc" }, { createdAt: "desc" }],
            take: 1,
            select: {
              id: true,
              type: true,
              note: true,
              counselingDate: true,
              createdAt: true,
              dosen: { select: { nama: true } },
            },
          },
          pointChanges: {
            where: { delta: { lt: 0 } },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              id: true,
              type: true,
              pillar: true,
              severity: true,
              delta: true,
              reason: true,
              createdAt: true,
            },
          },
        },
      }),
      database.dosen.findMany({
        orderBy: { nama: "asc" },
        select: {
          id: true,
          nuptk: true,
          nama: true,
          _count: {
            select: {
              mahasiswaBimbingan: true,
              counselingRecords: true,
            },
          },
        },
      }),
    ]);
    response.json({
      students: students.map((student) => ({
        ...student,
        dosenPa: student.dosenPa
          ? { ...student.dosenPa, nuptk: student.dosenPa.nuptk.toString() }
          : null,
      })),
      lecturers: lecturers.map((lecturer) => ({
        ...lecturer,
        nuptk: lecturer.nuptk.toString(),
      })),
    });
  } catch (error) {
    console.error("Gagal memuat monitoring kemahasiswaan:", error);
    response.status(500).json({ message: "Data monitoring kemahasiswaan gagal dimuat." });
  }
});

authRouter.get("/counseling", requireRole(["mhs", "dosen"], "Catatan konseling hanya tersedia untuk mahasiswa dan dosen PA."), async (request, response) => {
  const session = currentSession(response);

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

authRouter.post("/counseling", requireRole(["dosen"], "Hanya dosen PA yang dapat mencatat pembinaan dan panggilan konseling."), async (request, response) => {
  const session = currentSession(response);

  const input = parseBody(counselingSchema, request.body);
  if (!input) {
    response.status(400).json({ message: "Mahasiswa, jenis catatan, isi catatan, dan tanggal konseling wajib diisi dengan benar." });
    return;
  }
  const { studentId, type, note, counselingDate } = input;

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
        note,
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

authRouter.get("/points", requireRole(["mhs"], "Data poin hanya tersedia untuk akun mahasiswa."), async (request, response) => {
  const session = currentSession(response);

  try {
    const [student, activityTotals, pillarTotals, severityTotals] = await Promise.all([
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
              pillar: true,
              severity: true,
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
      database.pointChange.groupBy({
        by: ["pillar"],
        where: { studentId: session.profile.id, delta: { lt: 0 } },
        _sum: { delta: true },
        _count: { _all: true },
      }),
      database.pointChange.groupBy({
        by: ["severity"],
        where: { studentId: session.profile.id, delta: { lt: 0 } },
        _count: { _all: true },
      }),
    ]);
    if (!student) {
      response.status(404).json({ message: "Data mahasiswa tidak ditemukan." });
      return;
    }

    const pillarTotalsByPillar = new Map(
      pillarTotals
        .filter(
          (total): total is typeof total & { pillar: DisciplinePillar } =>
            total.pillar !== null,
        )
        .map((total) => [total.pillar, total]),
    );
    const severityCounts: Record<ViolationSeverity, number> = {
      RINGAN: 0,
      SEDANG: 0,
      BERAT: 0,
      SANGAT_BERAT: 0,
    };
    for (const total of severityTotals) {
      if (total.severity !== null) {
        severityCounts[total.severity] = total._count._all;
      }
    }

    response.json({
      score: student.pointScore,
      predicate: getScorePredicate(student.pointScore),
      activityPoints: activityTotals._sum.delta ?? 0,
      verifiedActivityCount: activityTotals._count._all,
      changes: student.pointChanges.map((change) => ({
        ...change,
        followUp: change.severity
          ? violationSeverityFollowUps[change.severity]
          : null,
      })),
      pillars: (Object.entries(disciplinePillarLabels) as [
        DisciplinePillar,
        string,
      ][]).map(([pillar, label]) => {
        const total = pillarTotalsByPillar.get(pillar);
        return {
          pillar,
          label,
          violationCount: total?._count._all ?? 0,
          pointsDeducted: Math.abs(total?._sum.delta ?? 0),
        };
      }),
      severityCounts,
    });
  } catch (error) {
    console.error("Gagal memuat poin mahasiswa:", error);
    response.status(500).json({ message: "Data poin mahasiswa gagal dimuat." });
  }
});

authRouter.post("/points/adjust", requireRole(["admin"], "Hanya admin kemahasiswaan yang dapat mencatat perubahan poin."), async (request, response) => {
  const session = currentSession(response);

  const { nim, type, reason } = request.body ?? {};
  if (type === "reported_violation" || type === "discipline_violation") {
    response.status(409).json({
      message: "Pengurangan poin pelanggaran hanya dapat dilakukan setelah Dosen PA mengonfirmasi laporan.",
    });
    return;
  }
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
  const changeType = pointChangeRules[action].type;
  const metadata = getPointChangeMetadata(changeType);
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

        const { score, delta: appliedDelta } = calculatePointChange(student.pointScore, action);
        await transaction.mahasiswa.update({
          where: { id: student.id },
          data: { pointScore: score },
        });
        await transaction.pointChange.create({
          data: {
            studentId: student.id,
            type: changeType,
            pillar: metadata.pillar,
            severity: metadata.severity,
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

authRouter.post("/logout", async (request, response) => {
  const token = readSessionToken(request);
  if (token) {
    await deleteSession(token).catch((error) => {
      console.error("Gagal menghapus sesi saat logout:", error);
    });
  }
  clearSessionCookie(response);
  response.status(204).end();
});
