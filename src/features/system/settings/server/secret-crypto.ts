import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import { env } from "@/env/server";

/**
 * At-rest encryption for settings that hold third-party credentials.
 *
 * The `settings.value` column is plain text and is rendered in the admin grid,
 * matched by the global search, and readable by anyone with database access —
 * all fine for a timezone, not for an API token. Values written through here are
 * AES-256-GCM ciphertext, decrypted only at the point of the outbound call.
 *
 * The stored form is versioned (`v1:iv:tag:ciphertext`, each part base64) so a
 * future key rotation can recognise and re-wrap what it finds instead of
 * guessing at the layout.
 */

const VERSION = "v1";
const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const KEY_BYTES = 32;

export class SettingSecretError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "SettingSecretError";
  }
}

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;

  if (!env.SETTINGS_ENCRYPTION_KEY) {
    throw new SettingSecretError(
      "SETTINGS_ENCRYPTION_KEY is not set, so credentials cannot be stored. Generate one with: openssl rand -base64 32",
    );
  }

  const key = Buffer.from(env.SETTINGS_ENCRYPTION_KEY, "base64");

  if (key.length !== KEY_BYTES) {
    throw new SettingSecretError(
      `SETTINGS_ENCRYPTION_KEY must decode to ${KEY_BYTES} bytes, got ${key.length}. Generate one with: openssl rand -base64 32`,
    );
  }

  cachedKey = key;
  return key;
}

/** True when the stored text was produced by `encryptSecret`. */
export function isEncryptedSecret(stored: string): boolean {
  return stored.startsWith(`${VERSION}:`);
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);

  return [
    VERSION,
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    ciphertext.toString("base64"),
  ].join(":");
}

/**
 * Reverses `encryptSecret`.
 *
 * Throws rather than returning null on a bad key or tampered value: a rotated
 * key that silently yielded an empty token would surface as a confusing
 * "not connected" much later, instead of at the point the operator can fix it.
 */
export function decryptSecret(stored: string): string {
  if (!isEncryptedSecret(stored)) {
    throw new SettingSecretError("Stored secret is not in the expected format");
  }

  const [, ivB64, tagB64, ciphertextB64] = stored.split(":");

  if (!ivB64 || !tagB64 || !ciphertextB64) {
    throw new SettingSecretError("Stored secret is malformed");
  }

  try {
    const decipher = createDecipheriv(
      ALGORITHM,
      getKey(),
      Buffer.from(ivB64, "base64"),
    );
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));

    return Buffer.concat([
      decipher.update(Buffer.from(ciphertextB64, "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch (error) {
    throw new SettingSecretError("Stored secret could not be decrypted", {
      cause: error,
    });
  }
}

/**
 * Masked form for the admin grid and the edit dialog.
 *
 * The last four characters are enough for an operator to tell which credential
 * is stored without the value ever leaving the server.
 */
export function secretHint(plain: string): string {
  const tail = plain.slice(-4);
  return tail.length > 0 ? `••••${tail}` : "••••";
}

/** Hint for a stored (encrypted) value, or null when it cannot be read. */
export function secretHintFromStored(stored: string | null): string | null {
  if (!stored) return null;

  try {
    return secretHint(decryptSecret(stored));
  } catch {
    return null;
  }
}
