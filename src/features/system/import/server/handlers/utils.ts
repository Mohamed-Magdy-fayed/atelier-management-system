import { inArray } from "drizzle-orm";

import { BranchesTable } from "@/drizzle/schema";

import type { ImportColumnSpec, ImportEntitySpec } from "../../specs";
import type { ImportDb, PreparedRow } from "./types";

/**
 * Looks a column up by key. A spec is a compile-time constant, so a miss is a
 * programming error, not bad input — hence the throw rather than a row reason.
 */
export function findColumn(
  spec: ImportEntitySpec,
  key: string,
): ImportColumnSpec {
  const column = spec.columns.find((candidate) => candidate.key === key);
  if (!column) {
    throw new Error(`Import spec "${spec.slug}" has no column "${key}"`);
  }
  return column;
}

/**
 * Flags rows whose natural key repeats within the same file.
 *
 * Both copies are flagged, not just the second: the admin needs to find and
 * reconcile the pair, and silently keeping whichever came first would make the
 * outcome depend on row order.
 */
export function markInFileDuplicates(
  rows: PreparedRow[],
  columnKey: string,
): void {
  const counts = new Map<string, number>();

  for (const row of rows) {
    if (row.reasons.length > 0 || !row.naturalKey) continue;
    counts.set(row.naturalKey, (counts.get(row.naturalKey) ?? 0) + 1);
  }

  for (const row of rows) {
    if (!row.naturalKey) continue;
    if ((counts.get(row.naturalKey) ?? 0) > 1) {
      row.reasons.push({
        reasonKey: "systemPages.importReasonDuplicateInFile",
        params: { column: columnKey },
      });
    }
  }
}

/**
 * Resolves branch short codes to ids for a whole batch in one query.
 *
 * Returns a lookup keyed by uppercased short code, matching how the branches
 * handler normalizes them on the way in.
 */
export async function loadBranchIdsByShortCode(
  db: ImportDb,
  shortCodes: string[],
): Promise<Map<string, string>> {
  const unique = Array.from(
    new Set(shortCodes.map((code) => code.toUpperCase()).filter(Boolean)),
  );

  if (unique.length === 0) return new Map();

  const rows = await db
    .select({ id: BranchesTable.id, shortCode: BranchesTable.shortCode })
    .from(BranchesTable)
    .where(inArray(BranchesTable.shortCode, unique));

  return new Map(rows.map((row) => [row.shortCode.toUpperCase(), row.id]));
}
