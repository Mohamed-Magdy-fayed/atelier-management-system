import { createHash } from "node:crypto";

/**
 * Stable UUIDs for every demo row.
 *
 * Re-running the profile must not duplicate anything, and the cleanup step has
 * to be able to find exactly what a previous run wrote without truncating
 * tables the profile does not own. Both fall out of deriving each id from its
 * logical name instead of letting Postgres mint one.
 *
 * This is UUID v5 in shape (SHA-1 of a namespace + name, version and variant
 * bits forced) — implemented here rather than pulled in as a dependency
 * because the seed only needs the one function.
 */
const DEMO_NAMESPACE = "a7f3c1e0-5b2d-4c8a-9e6f-1d0b3a5c7e94";

function namespaceBytes(): Buffer {
  return Buffer.from(DEMO_NAMESPACE.replace(/-/g, ""), "hex");
}

export function demoId(kind: string, key: string | number): string {
  const hash = createHash("sha1");
  hash.update(namespaceBytes());
  hash.update(`demo:${kind}:${key}`, "utf8");
  const bytes = hash.digest().subarray(0, 16);

  // Version 5, RFC 4122 variant.
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = bytes.toString("hex");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
}
