import type { MigrationSql } from "./connections";

export type MigrationContext = {
  legacy: MigrationSql;
  target: MigrationSql;
  dryRun: boolean;
};

export async function countLegacy(
  legacy: MigrationSql,
  table: string,
): Promise<number> {
  const rows = await legacy.unsafe(
    `SELECT COUNT(*)::int AS count FROM "${table}"`,
  );
  return Number((rows[0] as unknown as { count: number }).count);
}

export async function countTarget(
  target: MigrationSql,
  table: string,
): Promise<number> {
  const rows = await target.unsafe(
    `SELECT COUNT(*)::int AS count FROM "${table}"`,
  );
  return Number((rows[0] as unknown as { count: number }).count);
}

/** Map legacy varchar ids to uuid; invalid branch ids fall back to first migrated branch. */
export function sqlUuidCast(column: string) {
  return `${column}::uuid`;
}

export function logStep(
  step: string,
  message: string,
  extra?: Record<string, unknown>,
) {
  const suffix = extra ? ` ${JSON.stringify(extra)}` : "";
  console.log(`[${step}] ${message}${suffix}`);
}

/** postgres.js rejects `undefined`; use SQL NULL instead. */
export function sqlNullable<T>(value: T | undefined | null): T | null {
  return value === undefined ? null : value;
}

export function pickLegacy<T>(
  raw: Record<string, unknown>,
  key: string,
): T | undefined {
  if (Object.hasOwn(raw, key)) return raw[key] as T;
  const lower = key.toLowerCase();
  for (const [k, v] of Object.entries(raw)) {
    if (k.toLowerCase() === lower) return v as T;
  }
  return undefined;
}
