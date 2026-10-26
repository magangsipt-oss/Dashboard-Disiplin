import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);
const SCRYPT_KEY_LENGTH = 64;

async function derivePassword(password: string, salt: Buffer): Promise<Buffer> {
  return (await scryptAsync(password, salt, SCRYPT_KEY_LENGTH)) as Buffer;
}

export function isHashedPassword(storedPassword: string): boolean {
  return storedPassword.startsWith("scrypt$");
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derivedKey = await derivePassword(password, salt);
  return `scrypt$${salt.toString("base64url")}$${derivedKey.toString("base64url")}`;
}

export async function hashImportedPasswords<T extends { password: string }>(
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

// Hanya hash scrypt yang diterima. Password teks polos lama harus
// di-hash dulu lewat `npm run prisma:hash-passwords`.
export async function verifyPassword(
  password: string,
  storedPassword: string,
): Promise<boolean> {
  if (!isHashedPassword(storedPassword)) {
    return false;
  }
  const [, encodedSalt, encodedKey] = storedPassword.split("$");
  if (!encodedSalt || !encodedKey) {
    return false;
  }

  const salt = Buffer.from(encodedSalt, "base64url");
  const expectedKey = Buffer.from(encodedKey, "base64url");
  if (salt.length !== 16 || expectedKey.length !== SCRYPT_KEY_LENGTH) {
    return false;
  }

  const actualKey = await derivePassword(password, salt);
  return timingSafeEqual(actualKey, expectedKey);
}
