import { randomBytes, scrypt, timingSafeEqual, createHash } from "node:crypto";
import { resolve } from "node:path";
import { promisify } from "node:util";
import dotenv from "dotenv";
import { Router, type NextFunction, type Request, type Response } from "express";
import { Prisma, PrismaClient } from "@prisma/client";
import multer from "multer";
import {
  saveAcademicUpload,
  listAcademicUploads,
  getAcademicUploadPreview,
  getAcademicUploadFilePath,
} from "./academic-files";
import {
  AcademicImportValidationError,
  parseAcademicAttendanceFile,
  parseNewLecturerImportFile,
  parseNewStudentImportFile,
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
import { sendPointDeductionEmail } from "./mailer";

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
    if (!/\.(csv|xls|xlsx)$/i.test(file.originalname)) {
      callback(new Error("Format file harus CSV atau Excel (.xls, .xlsx)."));
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

async function hashImportedPasswords<T extends { password: string }>(
  rows: T[],
): Promise<Array<Omit<T, "password"> & { password: string }>> {
  const hashedRows: Array<Omit<T, "password"> & { password: string }> = [];
  for (let index = 0; index < rows.length; index += 32) {
    const batch = await Promise.all(
      rows.slice(index, index + 32).map(async ({ password, ...row }) => ({
        ...row,
        password: await hashPassword(password),
      })),
    );
    hashedRows.push(...batch);
  }
  return hashedRows;
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

authRouter.post(
  "/academic/students/import",
  requireAcademicUploadSession,
  academicUploadFile,
  async (request, response) => {
    if (!request.file) {
      response.status(400).json({ message: "Pilih file data mahasiswa Excel (.xls atau .xlsx)." });
      return;
    }

    try {
      const rows = parseNewStudentImportFile(
        request.file.buffer,
        request.file.originalname,
      );
      const existingStudents = await database.mahasiswa.findMany({
        where: { nim: { in: rows.map((row) => row.nim) } },
        select: { nim: true },
      });
      const existingNims = new Set(existingStudents.map((student) => student.nim));
      const newRows = rows.filter((row) => !existingNims.has(row.nim));
      const hashedRows = await hashImportedPasswords(newRows);
      const result = await database.$transaction((transaction) =>
        transaction.mahasiswa.createMany({
          data: hashedRows.map((row) => ({
            nim: row.nim,
            nama: row.nama,
            jurusan: row.jurusan,
            password: row.password,
            email: row.email,
            noHandphone: row.noHandphone,
            angkatan: row.angkatan,
            namaSmta: row.namaSmta,
          })),
          skipDuplicates: true,
        }),
      );

      response.json({
        imported: result.count,
        skipped: rows.length - result.count,
        totalRows: rows.length,
      });
    } catch (error) {
      if (error instanceof AcademicImportValidationError) {
        response.status(400).json({ message: error.message });
        return;
      }
      console.error("Gagal mengimpor data mahasiswa baru:", error);
      response.status(500).json({ message: "Data mahasiswa gagal diimpor." });
    }
  },
);

authRouter.post(
  "/academic/lecturers/import",
  requireAcademicUploadSession,
  academicUploadFile,
  async (request, response) => {
    if (!request.file) {
      response.status(400).json({ message: "Pilih file data dosen Excel (.xls atau .xlsx)." });
      return;
    }

    try {
      const rows = parseNewLecturerImportFile(
        request.file.buffer,
        request.file.originalname,
      );
      const [existingIdentities, matchingEmails] = await Promise.all([
        database.dosen.findMany({
          where: {
            OR: [
              { nuptk: { in: rows.map((row) => row.nuptk) } },
            ],
          },
          select: { nuptk: true },
        }),
        database.dosen.findMany({
          where: {
            email: {
              in: rows.map((row) => row.email),
              mode: "insensitive",
            },
          },
          select: { email: true },
        }),
      ]);
      const existingNuptks = new Set(
        existingIdentities.map((lecturer) => lecturer.nuptk.toString()),
      );
      const existingEmails = new Set(
        matchingEmails.map((lecturer) => lecturer.email?.toLowerCase()),
      );
      const newRows = rows.filter(
        (row) =>
          !existingNuptks.has(row.nuptk.toString()) &&
          !existingEmails.has(row.email.toLowerCase()),
      );
      const hashedRows = await hashImportedPasswords(newRows);
      const result = await database.$transaction((transaction) =>
        transaction.dosen.createMany({
          data: hashedRows,
          skipDuplicates: true,
        }),
      );

      response.json({
        imported: result.count,
        skipped: rows.length - result.count,
        totalRows: rows.length,
      });
    } catch (error) {
      if (error instanceof AcademicImportValidationError) {
        response.status(400).json({ message: error.message });
        return;
      }
      console.error("Gagal mengimpor data dosen baru:", error);
      response.status(500).json({ message: "Data dosen gagal diimpor." });
    }
  },
);

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
      response.status(400).json({ message: "Pilih file absensi CSV atau Excel (.xls, .xlsx)." });
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
        select: { id: true, nim: true, pointScore: true, nama: true, email: true, jurusan: true },
      });
      const studentMap = new Map(students.map((student) => [student.nim, student]));
      const unknownNims = nims.filter((nim) => !studentMap.has(nim));
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

      const { imported, deductionCount, totalPointsDeducted, deductedStudents } = await database.$transaction(async (transaction) => {
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
            ON CONFLICT ("Mata_Kuliah", "Kelas", "NIM") 
            DO UPDATE SET 
              "Jumlah_Kehadiran" = EXCLUDED."Jumlah_Kehadiran",
              "Nama_Mahasiswa" = EXCLUDED."Nama_Mahasiswa",
              "Timestamp" = NOW()
            RETURNING "ID" AS inserted_id
          `;
          insertedCount += inserted.length;
        }

        const rowsWithAlpa = rows.filter((row) => row.alpa > 0);
        let deductionCount = 0;
        let totalPointsDeducted = 0;
        const deductedStudents: Array<{
          nim: number;
          nama: string;
          email: string | null;
          prodi: string;
          mataKuliah: string;
          alpa: number;
          delta: number;
          scoreAfter: number;
          severity: ViolationSeverity;
          reason: string;
        }> = [];

        const currentStudentScores = new Map<number, number>();
        for (const student of students) {
          currentStudentScores.set(student.id, student.pointScore);
        }

        for (const row of rowsWithAlpa) {
          const student = studentMap.get(row.nim);
          if (!student) continue;

          const reasonIdentifier = `(${row.mataKuliah} - ${row.kelas})`;

          const existingDeduction = await transaction.pointChange.findFirst({
            where: {
              studentId: student.id,
              type: "UNEXCUSED_ABSENCE",
              reason: {
                contains: reasonIdentifier,
              },
            },
          });

          if (existingDeduction) {
            continue;
          }

          let delta = -10;
          let severity: ViolationSeverity = "SEDANG";
          let reasonText = `Tidak hadir tanpa izin ${reasonIdentifier}: ${row.alpa} Alpa`;

          if (row.alpa === 1) {
            delta = -10;
            severity = "SEDANG";
            reasonText = `Tidak hadir tanpa izin ${reasonIdentifier}: 1 Alpa`;
          } else if (row.alpa === 2) {
            delta = -15;
            severity = "BERAT";
            reasonText = `Alpa berulang ${reasonIdentifier}: 2 Alpa`;
          } else {
            const extra = Math.min(10, (row.alpa - 2) * 5);
            delta = -15 - extra;
            severity = "BERAT";
            reasonText = `Alpa berulang ${reasonIdentifier}: ${row.alpa} Alpa (dikenai sanksi tambahan)`;
          }

          const currentScore = currentStudentScores.get(student.id) ?? student.pointScore;
          const { score: newScore, delta: actualDelta } = calculatePointChangeForDelta(currentScore, delta);

          currentStudentScores.set(student.id, newScore);

          await transaction.mahasiswa.update({
            where: { id: student.id },
            data: { pointScore: newScore },
          });

          await transaction.pointChange.create({
            data: {
              studentId: student.id,
              type: "UNEXCUSED_ABSENCE",
              pillar: "WAKTU",
              severity,
              delta: actualDelta,
              scoreAfter: newScore,
              reason: reasonText,
              recordedByIdentity: "Sistem Akademik (Upload Presensi)",
            },
          });

          await transaction.pemberitahuan.create({
            data: {
              studentId: student.id,
              judul: "Pengurangan Poin Disiplin Waktu (Ketidakhadiran)",
              isi: `Poin Anda berkurang ${Math.abs(actualDelta)} poin karena ketidakhadiran (${row.alpa} Alpa) pada mata kuliah ${row.mataKuliah} (${row.kelas}). Saldo poin Anda: ${newScore}.`,
              tautanTab: "dashboard",
              dibaca: false,
            },
          });

          deductionCount++;
          totalPointsDeducted += Math.abs(actualDelta);
          deductedStudents.push({
            nim: student.nim,
            nama: student.nama,
            email: student.email,
            prodi: student.jurusan,
            mataKuliah: row.mataKuliah,
            alpa: row.alpa,
            delta: actualDelta,
            scoreAfter: newScore,
            severity,
            reason: reasonText,
          });
        }

        return {
          imported: insertedCount,
          deductionCount,
          totalPointsDeducted,
          deductedStudents,
        };
      });

      // Kirim notifikasi email secara asynchronous (hanya kepada mahasiswa terkait)
      for (const item of deductedStudents) {
        if (item.email) {
          sendPointDeductionEmail({
            toEmail: item.email,
            studentName: item.nama,
            studentNim: item.nim,
            prodi: item.prodi,
            pillarName: "Disiplin Waktu",
            severityName: item.severity === "BERAT" ? "Berat" : "Sedang",
            delta: item.delta,
            scoreAfter: item.scoreAfter,
            reason: item.reason,
            category: "Ketidakhadiran (Absensi)",
          }).catch((err) => {
            console.error(`[Mailer] Error saat mengirim email ke ${item.email}:`, err);
          });
        }
      }

      let savedUploadRecord = null;
      try {
        const summaryText = deductionCount > 0
          ? `${imported} baris presensi disimpan. ${deductionCount} pengurangan poin otomatis diterapkan (${totalPointsDeducted} total poin dipotong).`
          : `${imported} baris absensi disimpan (${rows.length - imported} baris dilewati)`;

        savedUploadRecord = await saveAcademicUpload({
          category: "attendance",
          fileName: request.file.originalname,
          buffer: request.file.buffer,
          uploadedBy: getSessionForRequest(request, response)?.profile.name || getSessionForRequest(request, response)?.profile.identity || "Akademik",
          rowCount: imported,
          summary: summaryText,
        });
      } catch (err) {
        console.error("Gagal mencatat riwayat file absensi:", err);
      }

      response.json({
        imported,
        skipped: rows.length - imported,
        totalRows: rows.length,
        deductions: {
          totalDeductions: deductionCount,
          totalPointsDeducted,
          students: deductedStudents,
        },
        fileRecord: savedUploadRecord,
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
      response.status(400).json({ message: "Pilih file pembagian CSV atau Excel (.xls, .xlsx)." });
      return;
    }

    try {
      const rows = parseAdvisorAssignmentFile(
        request.file.buffer,
        request.file.originalname,
      );
      function normalizeProgramStudi(programStudi: string): string {
        return programStudi
          .normalize("NFKD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, " ")
          .trim();
      }

      function cleanLecturerName(name: string): string {
        return String(name || "")
          .normalize("NFKD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .replace(/\b(ir|dr|dra|drs|prof)\.?\b/gi, " ")
          .replace(/\b(s\.?t|m\.?t|s\.?tr|m\.?sc|m\.?si|csca|cplm|s\.?mn|m\.?m|m\.?eng|s\.?kom|m\.?kom|s\.?si|apt|s\.?st)\.?\b/gi, " ")
          .replace(/[^a-z0-9]+/g, " ")
          .trim();
      }

      const nims = rows.map((row) => row.nim);
      const [students, allAdvisors, totalStudents] = await Promise.all([
        database.mahasiswa.findMany({
          where: { nim: { in: nims } },
          select: { id: true, nim: true, jurusan: true },
        }),
        database.dosen.findMany({
          select: { id: true, nama: true, nuptk: true },
        }),
        database.mahasiswa.count(),
      ]);

      const studentByNim = new Map(
        students.map((student) => [student.nim, student]),
      );

      const advisorByNuptk = new Map(
        allAdvisors
          .map((advisor) => [String(advisor.nuptk), advisor]),
      );

      const advisorByName = allAdvisors.map((advisor) => ({
        advisor,
        clean: cleanLecturerName(advisor.nama),
        rawLower: advisor.nama.toLowerCase().trim(),
      }));

      function resolveAdvisorForRow(row: typeof rows[number]) {
        if (row.nuptk && advisorByNuptk.has(row.nuptk)) {
          return advisorByNuptk.get(row.nuptk)!;
        }
        if (row.dpa) {
          const rawLower = row.dpa.toLowerCase().trim();
          const exact = advisorByName.find((a) => a.rawLower === rawLower);
          if (exact) return exact.advisor;

          const cleanDpa = cleanLecturerName(row.dpa);
          if (cleanDpa) {
            const match = advisorByName.find(
              (a) =>
                a.clean === cleanDpa ||
                (cleanDpa.length >= 4 && a.clean.includes(cleanDpa)) ||
                (a.clean.length >= 4 && cleanDpa.includes(a.clean)),
            );
            if (match) return match.advisor;
          }
        }
        return null;
      }

      const missingNims = nims.filter((nim) => !studentByNim.has(nim));
      const mismatchedPrograms = rows.filter((row) => {
        const student = studentByNim.get(row.nim);
        return (
          student !== undefined &&
          normalizeProgramStudi(student.jurusan) !==
            normalizeProgramStudi(row.programStudi)
        );
      });
      const unresolvableRows = rows.filter((row) => !resolveAdvisorForRow(row));

      if (
        missingNims.length > 0 ||
        mismatchedPrograms.length > 0 ||
        unresolvableRows.length > 0
      ) {
        const missingDpas = [
          ...new Set(unresolvableRows.map((r) => r.dpa || r.nuptk || String(r.nim))),
        ];
        const details = [
          missingNims.length > 0
            ? `NIM tidak ditemukan: ${missingNims.slice(0, 20).join(", ")}`
            : "",
          mismatchedPrograms.length > 0
            ? `Program Studi tidak sesuai untuk NIM: ${mismatchedPrograms
                .slice(0, 20)
                .map((row) => row.nim)
                .join(", ")}`
            : "",
          missingDpas.length > 0
            ? `Dosen PA tidak ditemukan: ${missingDpas.slice(0, 20).join(", ")}`
            : "",
        ].filter(Boolean);
        response.status(400).json({
          message: `${details.join(". ")}. Periksa NIM dan Program Studi; tidak ada pembagian yang diubah.`,
        });
        return;
      }

      const resolvedAssignments = rows.map((row) => {
        const student = studentByNim.get(row.nim);
        const advisor = resolveAdvisorForRow(row);
        if (!student || !advisor) {
          throw new Error("Data mahasiswa atau dosen berubah selama proses impor.");
        }
        return { studentId: student.id, dosenId: advisor.id };
      });

      const now = new Date();
      await database.$transaction(async (transaction) => {
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

      let savedUploadRecord = null;
      try {
        savedUploadRecord = await saveAcademicUpload({
          category: "advisors",
          fileName: request.file.originalname,
          buffer: request.file.buffer,
          uploadedBy: getSessionForRequest(request, response)?.profile.name || getSessionForRequest(request, response)?.profile.identity || "Akademik",
          rowCount: rows.length,
          summary: `${rows.length} mahasiswa dibagikan DPA`,
        });
      } catch (err) {
        console.error("Gagal mencatat riwayat file pembagian DPA:", err);
      }

      response.json({
        assigned: rows.length,
        totalUpdated: rows.length,
        totalStudents,
        fileRecord: savedUploadRecord,
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

authRouter.get(
  "/academic/files",
  requireAcademicUploadSession,
  async (request, response) => {
    try {
      const category = request.query.category as
        | "attendance"
        | "advisors"
        | undefined;
      const files = await listAcademicUploads(category);
      response.json({ files });
    } catch (error) {
      console.error("Gagal memuat riwayat file akademik:", error);
      response.status(500).json({ message: "Gagal memuat riwayat file." });
    }
  },
);

authRouter.get(
  "/academic/files/:id/preview",
  requireAcademicUploadSession,
  async (request, response) => {
    try {
      const preview = await getAcademicUploadPreview(String(request.params.id));
      if (!preview) {
        response.status(404).json({ message: "File upload tidak ditemukan." });
        return;
      }
      response.json(preview);
    } catch (error) {
      console.error("Gagal memuat preview file akademik:", error);
      response.status(500).json({ message: "Gagal memuat preview file." });
    }
  },
);

authRouter.get(
  "/academic/files/:id/download",
  requireAcademicUploadSession,
  async (request, response) => {
    try {
      const fileInfo = await getAcademicUploadFilePath(String(request.params.id));
      if (!fileInfo) {
        response.status(404).json({ message: "File upload tidak ditemukan." });
        return;
      }
      response.download(fileInfo.absolutePath, fileInfo.record.fileName);
    } catch (error) {
      console.error("Gagal mengunduh file akademik:", error);
      response.status(500).json({ message: "Gagal mengunduh file." });
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
            select: { id: true, nuptk: true, nama: true },
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
