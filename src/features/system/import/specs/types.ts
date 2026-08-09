import type { mainTranslations } from "@/features/core/i18n/global";
import type { TranslationKey } from "@/features/core/i18n/lib";

/**
 * Declarative description of what an entity's import file may contain.
 *
 * This module is deliberately client-safe: pure data and translation keys, no
 * server imports. The template generator and the column guide both run in the
 * browser off these specs, and the server handlers key off the same `slug`.
 */

/** Typing keys against the real catalogue means a typo fails to compile. */
export type ImportTranslationKey = TranslationKey<typeof mainTranslations>;

export const IMPORT_ENTITY_SLUGS = [
  "branches",
  "employees",
  "customers",
  "dresses",
  "reservations",
  "payments",
  "expenses",
] as const;

export type ImportEntitySlug = (typeof IMPORT_ENTITY_SLUGS)[number];

export type ImportColumnType =
  | "string"
  | "int"
  | "money"
  | "date"
  | "datetime"
  | "boolean"
  | "enum"
  /** Foreign key supplied as a human-readable natural key, not a UUID. */
  | "ref";

/** How a `ref` column's cell text is matched to an existing record. */
export type ImportRefLookup =
  | "code"
  | "phone"
  | "email"
  | "shortCode"
  | "reservationCode";

export type ImportColumnSpec = {
  /** Canonical header, written verbatim into the template. */
  key: string;
  labelKey: ImportTranslationKey;
  required: boolean;
  type: ImportColumnType;
  /** Accepted values for `enum` columns. */
  enumValues?: readonly string[];
  /** Target entity and match strategy for `ref` columns. */
  ref?: { entity: ImportEntitySlug; lookupBy: ImportRefLookup };
  maxLength?: number;
  /** Extra headers accepted from old-system exports, matched case-insensitively. */
  aliases?: readonly string[];
  /** Shown in the column guide only — never written into the template. */
  exampleValue: string;
  helpKey?: ImportTranslationKey;
};

export type ImportEntitySpec = {
  slug: ImportEntitySlug;
  kind: "master" | "transactional";
  titleKey: ImportTranslationKey;
  /**
   * Minimum role, when the entity's own mutations demand more than operational
   * staff. Import writes to the same tables, so it must not be a weaker door:
   * anything gated on `assertAdminRole` in its router has to say so here.
   */
  requiredRole?: "admin";
  /** Entities that must be imported first, for the recommended order. */
  dependsOn: readonly ImportEntitySlug[];
  /** Columns identifying an existing record, for dedupe and create-vs-update. */
  naturalKey: readonly string[];
  /** True when rows belong to a branch and the job's branch is the fallback. */
  branchScoped: boolean;
  columns: readonly ImportColumnSpec[];
  batchSize: number;
};

export const DEFAULT_IMPORT_BATCH_SIZE = 500;

/**
 * Upload ceiling. Vercel caps serverless request bodies at 4.5 MB and that
 * applies to the tRPC route, so the file is refused in the browser with a clear
 * message rather than failing as an opaque 413.
 */
export const MAX_IMPORT_FILE_BYTES = 4 * 1024 * 1024;

/** Hard stop on rows per job, so one paste cannot exhaust the row table. */
export const MAX_IMPORT_ROWS = 100_000;
