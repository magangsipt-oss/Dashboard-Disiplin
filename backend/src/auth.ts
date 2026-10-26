import { randomBytes, scrypt, timingSafeEqual, createHash } from "node:crypto";
import { resolve } from "node:path";
import { promisify } from "node:util";
import dotenv from "dotenv";
import { Router, type NextFunction, type Request, type Response } from "express";
import { Prisma, PrismaClient } from "@prisma/client";
import multer from "multer";
import {
  AcademicImportValidationError,
  parseAcademicAttendanceFile,
  parseAdvisorAssignmentFile,
} from "./academic-import";
import {
  calculatePointChange,
  calculatePointChangeForDelta,
  disciplinePillarLabels,
  getPointChangeMetadata,
  getScorePredicate,
  pointChangeRules,
  violationSeverityPointRanges,
  violationSeverityFollowUps,
  type DisciplinePillar,
  type ViolationSeverity,
  type PointChangeAction,
} from "./points";

dotenv.config({ path: resolve(__dirname, "../.env") });

const scryptAsync = promisify(scrypt);
export const database = new PrismaClient();
const SESSION_COOKIE = "sidisiplin_session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const SCRYPT_KEY_LENGTH = 64;
const academicUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_request, file, callback) => {
    if (!/\.(csv|xlsx)$/i.test(file.originalname)) {
      callback(new Error("Format file harus CSV atau Excel (.xlsx)."));
      return;
    }
    callback(null, true);
  },
});

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
  updatePassword: (password: string) => Promise<unknown>;
};

export type Session = {
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
      updatePassword: (password) =>
        database.mahasiswa.update({
          where: { id: account.id },
          data: { password },
        }),
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
    updatePassword: async (password) => {
      const updatedRows = await database.$executeRaw(
        Prisma.sql`UPDATE public.${Prisma.raw(`"${table}"`)}
        SET "Password" = ${password}
        WHERE "ID" = ${account.id}`,
      );
      if (updatedRows !== 1) {
        throw new Error(`Akun pada tabel "${table}" tidak lagi tersedia.`);
      }
    },
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

function academicUploadFile(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  academicUpload.single("file")(request, response, (error: unknown) => {
    if (!error) {
      next();
      return;
    }
    if (error instanceof multer.MulterError) {
      response.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({
        message:
          error.code === "LIMIT_FILE_SIZE"
            ? "Ukuran file maksimal 10 MB."
            : "File upload tidak valid.",
      });
      return;
    }
    response.status(400).json({
      message:
        error instanceof Error ? error.message : "File upload tidak valid.",
    });
  });
}

function requireAcademicUploadSession(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const session = getSessionForRequest(request, response);
  if (!session) {
    response.status(401).json({ message: "Sesi login tidak ditemukan atau sudah berakhir." });
    return;
  }
  if (session.profile.role !== "akademik") {
    response.status(403).json({ message: "Fitur ini hanya tersedia untuk akun Akademik." });
    return;
  }
  next();
}

authRouter.post("/login", async (request, response) => {
  const { role, identity, password } = request.body ?? {};
  if (
    !["mhs", "dosen", "admin", "akademik"].includes(role) ||
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

authRouter.post(
  "/academic/attendance/import",
  requireAcademicUploadSession,
  academicUploadFile,
  async (request, response) => {
    if (!request.file) {
      response.status(400).json({ message: "Pilih file absensi CSV atau Excel (.xlsx)." });
      return;
    }

    try {
      const rows = parseAcademicAttendanceFile(
        request.file.buffer,
        request.file.originalname,
      );
      const nims = [...new Set(rows.map((row) => row.nim))];
      const students = await database.mahasiswa.findMany({
        where: { nim: { in: nims } },
        select: { nim: true },
      });
      const knownNims = new Set(students.map((student) => student.nim));
      const unknownNims = nims.filter((nim) => !knownNims.has(nim));
      if (unknownNims.length > 0) {
        const displayNims = unknownNims.slice(0, 20).join(", ");
        const remaining =
          unknownNims.length > 20
            ? ` dan ${unknownNims.length - 20} NIM lainnya`
            : "";
        response.status(400).json({
          message: `Mahasiswa dengan NIM berikut tidak ditemukan: ${displayNims}${remaining}. Tidak ada data yang diimpor.`,
        });
        return;
      }

      const imported = await database.$transaction(async (transaction) => {
        let insertedCount = 0;
        for (let index = 0; index < rows.length; index += 5_000) {
          const chunk = rows.slice(index, index + 5_000);
          const inserted = await transaction.$queryRaw<
            Array<{ inserted_id: number }>
          >`
            INSERT INTO "PresensiAkademik"
              ("Mata_Kuliah", "Kelas", "NIM", "Nama_Mahasiswa", "Jumlah_Kehadiran")
            VALUES ${Prisma.join(
              chunk.map((row) => Prisma.sql`(
                ${row.mataKuliah},
                ${row.kelas},
                ${row.nim},
                ${row.namaMahasiswa},
                ${row.jumlahKehadiran}
              )`),
            )}
            ON CONFLICT ("Mata_Kuliah", "Kelas", "NIM") DO NOTHING
            RETURNING "ID" AS inserted_id
          `;
          insertedCount += inserted.length;
        }
        return insertedCount;
      });
      response.json({
        imported,
        skipped: rows.length - imported,
        totalRows: rows.length,
      });
    } catch (error) {
      if (error instanceof AcademicImportValidationError) {
        response.status(400).json({ message: error.message });
        return;
      }
      console.error("Gagal mengimpor absensi Akademik:", error);
      response.status(500).json({ message: "Data absensi gagal diimpor." });
    }
  },
);

authRouter.post(
  "/academic/advisor-assignments/import",
  requireAcademicUploadSession,
  academicUploadFile,
  async (request, response) => {
    if (!request.file) {
      response.status(400).json({ message: "Pilih file pembagian CSV atau Excel (.xlsx)." });
      return;
    }

    try {
      const rows = parseAdvisorAssignmentFile(
        request.file.buffer,
        request.file.originalname,
      );
      const nims = rows.map((row) => row.nim);
      const nips = [...new Set(rows.map((row) => BigInt(row.nip)))];
      const [students, advisors, totalStudents] = await Promise.all([
        database.mahasiswa.findMany({
          where: { nim: { in: nims } },
          select: { id: true, nim: true },
        }),
        database.dosen.findMany({
          where: { nip: { in: nips } },
          select: { id: true, nip: true },
        }),
        database.mahasiswa.count(),
      ]);
      const studentByNim = new Map(
        students.map((student) => [student.nim, student]),
      );
      const advisorByNip = new Map(
        advisors.map((advisor) => [String(advisor.nip), advisor]),
      );
      const missingNims = nims.filter((nim) => !studentByNim.has(nim));
      const missingNips = nips
        .map(String)
        .filter((nip) => !advisorByNip.has(nip));
      if (missingNims.length > 0 || missingNips.length > 0) {
        const details = [
          missingNims.length > 0
            ? `NIM tidak ditemukan: ${missingNims.slice(0, 20).join(", ")}`
            : "",
          missingNips.length > 0
            ? `NIP dosen tidak ditemukan: ${missingNips.slice(0, 20).join(", ")}`
            : "",
        ].filter(Boolean);
        response.status(400).json({
          message: `${details.join(". ")}. Tidak ada pembagian yang diubah.`,
        });
        return;
      }

      const resolvedAssignments = rows.map((row) => {
        const student = studentByNim.get(row.nim);
        const advisor = advisorByNip.get(row.nip);
        if (!student || !advisor) {
          throw new Error("Data mahasiswa atau dosen berubah selama proses impor.");
        }
        return { studentId: student.id, dosenId: advisor.id };
      });

      const now = new Date();
      await database.$transaction(async (transaction) => {
        await transaction.mahasiswa.updateMany({ data: { dosenPaId: null } });
        await transaction.advisorRequest.updateMany({
          where: { status: "APPROVED" },
          data: { status: "REJECTED", reviewedAt: now },
        });

        const assignmentsByAdvisor = new Map<number, number[]>();
        for (const assignment of resolvedAssignments) {
          const assignedStudentIds =
            assignmentsByAdvisor.get(assignment.dosenId) ?? [];
          assignedStudentIds.push(assignment.studentId);
          assignmentsByAdvisor.set(assignment.dosenId, assignedStudentIds);
        }

        const assignedStudentIds = resolvedAssignments.map(
          (assignment) => assignment.studentId,
        );
        const existingRequests = await transaction.advisorRequest.findMany({
          where: { studentId: { in: assignedStudentIds } },
          select: { studentId: true },
        });
        const existingRequestIds = new Set(
          existingRequests.map((request) => request.studentId),
        );

        for (const [advisorId, studentIds] of assignmentsByAdvisor) {
          await transaction.mahasiswa.updateMany({
            where: { id: { in: studentIds } },
            data: { dosenPaId: advisorId },
          });
          await transaction.advisorRequest.updateMany({
            where: { studentId: { in: studentIds } },
            data: { dosenId: advisorId, status: "APPROVED", reviewedAt: now },
          });
        }

        const newRequests = resolvedAssignments
          .filter(
            (assignment) => !existingRequestIds.has(assignment.studentId),
          )
          .map((assignment) => ({
            studentId: assignment.studentId,
            dosenId: assignment.dosenId,
            status: "APPROVED" as const,
            reviewedAt: now,
          }));
        if (newRequests.length > 0) {
          await transaction.advisorRequest.createMany({ data: newRequests });
        }
      });

      response.json({
        assigned: rows.length,
        unassigned: totalStudents - rows.length,
        totalStudents,
      });
    } catch (error) {
      if (error instanceof AcademicImportValidationError) {
        response.status(400).json({ message: error.message });
        return;
      }
      console.error("Gagal mengimpor pembagian mahasiswa bimbingan:", error);
      response.status(500).json({
        message: "Pembagian mahasiswa bimbingan gagal disimpan.",
      });
    }
  },
);

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
    response.status(403).json({ message: "Data dosen PA hanya tersedia untuk akun mahasiswa." });
    return;
  }

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

authRouter.get("/advisor/students", async (request, response) => {
  const session = getSessionForRequest(request, response);
  if (!session) {
    response.status(401).json({ message: "Sesi login tidak ditemukan atau sudah berakhir." });
    return;
  }
  if (session.profile.role !== "dosen") {
    response.status(403).json({ message: "Hanya akun dosen yang dapat melihat mahasiswa bimbingan." });
    return;
  }

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

authRouter.get("/admin/monitoring", async (request, response) => {
  const session = getSessionForRequest(request, response);
  if (!session) {
    response.status(401).json({ message: "Sesi login tidak ditemukan atau sudah berakhir." });
    return;
  }
  if (session.profile.role !== "admin") {
    response.status(403).json({ message: "Hanya admin kemahasiswaan yang dapat melihat monitoring seluruh mahasiswa dan dosen." });
    return;
  }

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
            select: { id: true, nip: true, nama: true },
          },
          counselingRecords: {
            orderBy: [{ counselingDate: "desc" }, { createdAt: "desc" }],
            take: 5,
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
          nip: true,
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
    response.json({ students, lecturers });
  } catch (error) {
    console.error("Gagal memuat monitoring kemahasiswaan:", error);
    response.status(500).json({ message: "Data monitoring kemahasiswaan gagal dimuat." });
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

  const { nim, type, reason, pillar, severity, deductionPoints } = request.body ?? {};
  const isReportedViolation = type === "reported_violation";
  if (isReportedViolation || type === "discipline_violation") {
    response.status(409).json({
      message: "Pengurangan poin pelanggaran hanya dapat dilakukan setelah Dosen PA mengonfirmasi laporan.",
    });
    return;
  }
  const violationRange =
    typeof severity === "string" &&
    Object.prototype.hasOwnProperty.call(violationSeverityPointRanges, severity)
      ? violationSeverityPointRanges[severity as ViolationSeverity]
      : undefined;
  if (
    typeof nim !== "string" ||
    !/^\d+$/.test(nim) ||
    !Number.isSafeInteger(Number(nim)) ||
    Number(nim) < 1 ||
    Number(nim) > 2_147_483_647 ||
    typeof type !== "string" ||
    (!isReportedViolation &&
      !Object.prototype.hasOwnProperty.call(pointChangeRules, type)) ||
    typeof reason !== "string" ||
    reason.trim().length === 0 ||
    reason.trim().length > 500 ||
    (isReportedViolation &&
      (typeof pillar !== "string" ||
        !Object.prototype.hasOwnProperty.call(disciplinePillarLabels, pillar) ||
        !violationRange ||
        !Number.isSafeInteger(deductionPoints) ||
        deductionPoints < violationRange.minimum ||
        deductionPoints > violationRange.maximum))
  ) {
    response.status(400).json({
      message:
        "NIM, jenis perubahan poin, dan catatan wajib diisi dengan benar. Pengurangan pelanggaran harus mengikuti rentang tingkat yang dipilih.",
    });
    return;
  }

  const action = isReportedViolation ? null : (type as PointChangeAction);
  const rule = action ? pointChangeRules[action] : null;
  const changeType = rule?.type ?? "REPORTED_VIOLATION";
  const metadata = isReportedViolation
    ? getPointChangeMetadata("REPORTED_VIOLATION", {
        pillar: pillar as DisciplinePillar,
        severity: severity as ViolationSeverity,
      })
    : getPointChangeMetadata(changeType);
  const requestedDelta = isReportedViolation
    ? -(deductionPoints as number)
    : rule!.delta;
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

        const { score, delta: appliedDelta } = isReportedViolation
          ? calculatePointChangeForDelta(student.pointScore, requestedDelta)
          : calculatePointChange(student.pointScore, action!);
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

authRouter.post("/logout", (request, response) => {
  const token = readSessionToken(request);
  if (token) {
    sessions.delete(token);
  }
  clearSessionCookie(response);
  response.status(204).end();
});
