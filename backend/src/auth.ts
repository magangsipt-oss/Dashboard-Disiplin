import { randomBytes, scrypt, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";
import dotenv from "dotenv";
import { Router, type Request, type Response } from "express";
import { PrismaClient } from "@prisma/client";

dotenv.config();

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
    roleLabel: "Kemahasiswaan/Admin",
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

authRouter.post("/logout", (request, response) => {
  const token = readSessionToken(request);
  if (token) {
    sessions.delete(token);
  }
  clearSessionCookie(response);
  response.status(204).end();
});
