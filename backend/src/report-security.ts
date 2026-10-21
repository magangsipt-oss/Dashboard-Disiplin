import { createHash, randomBytes } from "node:crypto";

export function createTrackingCode(): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0;
  let value = 0;
  let code = "";
  for (const byte of randomBytes(20)) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      code += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    code += alphabet[(value << (5 - bits)) & 31];
  }
  return code;
}

export function hashTrackingCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}
