import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// Salinan password terenkripsi untuk menu Data Password (hanya Kemahasiswaan).
// Login tetap memakai hash scrypt; salinan ini hanya untuk dilihat.
// Kunci AES-256 ada di PASSWORD_VAULT_KEY (64 karakter hex), tidak di database.
const VERSION = "v1";
const ALGORITHM = "aes-256-gcm";

function vaultKey(): Buffer | null {
  const raw = process.env.PASSWORD_VAULT_KEY?.trim();
  if (!raw) return null;
  const key = Buffer.from(raw, "hex");
  if (key.length !== 32) {
    throw new Error("PASSWORD_VAULT_KEY harus 64 karakter hex (hasil `openssl rand -hex 32`).");
  }
  return key;
}

export function isPasswordVaultEnabled(): boolean {
  return vaultKey() !== null;
}

// Null bila kunci belum diatur: password tetap tersimpan sebagai hash saja.
export function encryptPassword(password: string): string | null {
  const key = vaultKey();
  if (!key) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(password, "utf8"), cipher.final()]);
  return [VERSION, iv, cipher.getAuthTag(), encrypted].map((part) =>
    typeof part === "string" ? part : part.toString("base64url"),
  ).join("$");
}

// Null bila belum ada salinan, kunci tidak ada, atau data tidak cocok dengan kunci.
export function decryptPassword(stored: string | null | undefined): string | null {
  const key = vaultKey();
  if (!key || !stored) return null;
  const [version, iv, tag, encrypted] = stored.split("$");
  if (version !== VERSION || !iv || !tag || encrypted === undefined) return null;
  try {
    const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(encrypted, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return null;
  }
}
