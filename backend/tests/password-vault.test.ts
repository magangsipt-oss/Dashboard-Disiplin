import assert from "node:assert/strict";
import test from "node:test";
import { decryptPassword, encryptPassword, isPasswordVaultEnabled } from "../src/password-vault";

function withKey<T>(key: string | undefined, run: () => T): T {
  const previous = process.env.PASSWORD_VAULT_KEY;
  if (key === undefined) delete process.env.PASSWORD_VAULT_KEY;
  else process.env.PASSWORD_VAULT_KEY = key;
  try {
    return run();
  } finally {
    if (previous === undefined) delete process.env.PASSWORD_VAULT_KEY;
    else process.env.PASSWORD_VAULT_KEY = previous;
  }
}

const keyA = "a".repeat(64);
const keyB = "b".repeat(64);

test("password terenkripsi bisa dibuka kembali dengan kunci yang sama", () => {
  withKey(keyA, () => {
    const stored = encryptPassword("Rahasia#123");
    assert.ok(stored && !stored.includes("Rahasia"));
    assert.notEqual(stored, encryptPassword("Rahasia#123"));
    assert.equal(decryptPassword(stored), "Rahasia#123");
  });
});

test("tanpa kunci atau kunci berbeda, password tidak bisa dibuka", () => {
  const stored = withKey(keyA, () => encryptPassword("Rahasia#123"));
  withKey(undefined, () => {
    assert.equal(isPasswordVaultEnabled(), false);
    assert.equal(encryptPassword("x"), null);
    assert.equal(decryptPassword(stored), null);
  });
  withKey(keyB, () => assert.equal(decryptPassword(stored), null));
  withKey(keyA, () => assert.equal(decryptPassword("v1$rusak"), null));
});

test("kunci yang panjangnya salah ditolak", () => {
  withKey("abc", () => assert.throws(() => encryptPassword("x")));
});
