import {
  branchesImportSpec,
  customersImportSpec,
  dressesImportSpec,
  employeesImportSpec,
} from "./master";
import type { ImportEntitySlug, ImportEntitySpec } from "./types";

export * from "./types";

/**
 * Ordered by dependency: an entity always appears after everything it needs.
 * This matches the legacy migration runbook's step order and drives both the
 * entity picker and the "import these first" warning.
 */
export const IMPORT_SPECS: readonly ImportEntitySpec[] = [
  branchesImportSpec,
  employeesImportSpec,
  customersImportSpec,
  dressesImportSpec,
];

export function getImportSpec(slug: string): ImportEntitySpec | undefined {
  return IMPORT_SPECS.find((spec) => spec.slug === slug);
}

export function isImportEntitySlug(slug: string): slug is ImportEntitySlug {
  return IMPORT_SPECS.some((spec) => spec.slug === slug);
}

/** Column keys plus aliases, normalized for tolerant header matching. */
export function normalizeImportHeaderKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

/**
 * Maps a file's headers onto spec columns, tolerating case, spacing and the
 * per-column aliases seen in old-system exports. Headers that match nothing are
 * reported back to the admin rather than rejected.
 */
export function matchImportHeaders(spec: ImportEntitySpec, headers: string[]) {
  const byNormalized = new Map<string, string>();

  for (const column of spec.columns) {
    byNormalized.set(normalizeImportHeaderKey(column.key), column.key);
    for (const alias of column.aliases ?? []) {
      byNormalized.set(normalizeImportHeaderKey(alias), column.key);
    }
  }

  const columnKeyByHeader = new Map<string, string>();
  const ignoredColumns: string[] = [];

  for (const header of headers) {
    if (header.trim().length === 0) continue;

    const columnKey = byNormalized.get(normalizeImportHeaderKey(header));
    if (columnKey && !columnKeyByHeader.has(header)) {
      columnKeyByHeader.set(header, columnKey);
    } else if (!columnKey) {
      ignoredColumns.push(header);
    }
  }

  const mappedColumnKeys = new Set(columnKeyByHeader.values());
  const missingRequired = spec.columns
    .filter((column) => column.required && !mappedColumnKeys.has(column.key))
    .map((column) => column.key);

  return { columnKeyByHeader, ignoredColumns, missingRequired };
}
