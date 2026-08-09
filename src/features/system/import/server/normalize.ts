import type { ImportColumnSpec } from "../specs";

/**
 * Cell-level coercion, shared by every entity handler.
 *
 * Each function returns either a value or a reason key. Reasons are translation
 * keys resolved by the caller through `ctx.t`, so messages come back in the
 * admin's language without this module depending on the i18n runtime.
 */

export type CellResult<T> =
  | { ok: true; value: T }
  | { ok: false; reasonKey: string; params?: Record<string, string | number> };

const TRUE_VALUES = new Set(["true", "yes", "y", "1", "نعم"]);
const FALSE_VALUES = new Set(["false", "no", "n", "0", "لا"]);

export function readCell(
  row: Record<string, string>,
  columnKey: string,
): string {
  return (row[columnKey] ?? "").trim();
}

export function requireText(
  raw: string,
  column: ImportColumnSpec,
): CellResult<string> {
  if (raw.length === 0) {
    return {
      ok: false,
      reasonKey: "systemPages.importReasonRequired",
      params: { column: column.key },
    };
  }
  if (column.maxLength && raw.length > column.maxLength) {
    return {
      ok: false,
      reasonKey: "systemPages.importReasonTooLong",
      params: { column: column.key, max: column.maxLength },
    };
  }
  return { ok: true, value: raw };
}

export function optionalText(
  raw: string,
  column: ImportColumnSpec,
): CellResult<string | null> {
  if (raw.length === 0) return { ok: true, value: null };
  if (column.maxLength && raw.length > column.maxLength) {
    return {
      ok: false,
      reasonKey: "systemPages.importReasonTooLong",
      params: { column: column.key, max: column.maxLength },
    };
  }
  return { ok: true, value: raw };
}

/**
 * Whole numbers only. Money columns are stored as integers throughout the
 * schema, so `1500.50` is a mistake worth surfacing rather than rounding away.
 */
export function parseInteger(
  raw: string,
  column: ImportColumnSpec,
  { min = 0, max = 10_000_000 }: { min?: number; max?: number } = {},
): CellResult<number | null> {
  if (raw.length === 0) {
    return column.required
      ? {
          ok: false,
          reasonKey: "systemPages.importReasonRequired",
          params: { column: column.key },
        }
      : { ok: true, value: null };
  }

  const cleaned = raw.replace(/[,\s]/g, "");

  if (!/^-?\d+$/.test(cleaned)) {
    return {
      ok: false,
      reasonKey: "systemPages.importReasonNotWholeNumber",
      params: { column: column.key },
    };
  }

  const parsed = Number(cleaned);

  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
    return {
      ok: false,
      reasonKey: "systemPages.importReasonOutOfRange",
      params: { column: column.key, min, max },
    };
  }

  return { ok: true, value: parsed };
}

export function parseBoolean(
  raw: string,
  column: ImportColumnSpec,
): CellResult<boolean | null> {
  if (raw.length === 0) return { ok: true, value: null };

  const normalized = raw.toLowerCase();
  if (TRUE_VALUES.has(normalized)) return { ok: true, value: true };
  if (FALSE_VALUES.has(normalized)) return { ok: true, value: false };

  return {
    ok: false,
    reasonKey: "systemPages.importReasonNotBoolean",
    params: { column: column.key },
  };
}

export function parseEnum<T extends string>(
  raw: string,
  column: ImportColumnSpec,
  allowed: readonly T[],
): CellResult<T | null> {
  if (raw.length === 0) {
    return column.required
      ? {
          ok: false,
          reasonKey: "systemPages.importReasonRequired",
          params: { column: column.key },
        }
      : { ok: true, value: null };
  }

  // Old systems rarely match our casing exactly.
  const match = allowed.find(
    (value) => value.toLowerCase() === raw.toLowerCase(),
  );

  if (!match) {
    return {
      ok: false,
      reasonKey: "systemPages.importReasonNotAllowedValue",
      params: { column: column.key, allowed: allowed.join(", ") },
    };
  }

  return { ok: true, value: match };
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseEmail(
  raw: string,
  column: ImportColumnSpec,
): CellResult<string> {
  const required = requireText(raw, column);
  if (!required.ok) return required;

  const normalized = required.value.toLowerCase();

  if (!EMAIL_PATTERN.test(normalized)) {
    return {
      ok: false,
      reasonKey: "systemPages.importReasonInvalidEmail",
      params: { column: column.key },
    };
  }

  return { ok: true, value: normalized };
}

/**
 * Collects cell results, accumulating every failure rather than stopping at the
 * first — an admin fixing a spreadsheet wants the whole list in one pass.
 */
export class RowBuilder {
  readonly reasons: {
    reasonKey: string;
    params?: Record<string, string | number>;
  }[] = [];

  take<T>(result: CellResult<T>): T | null {
    if (result.ok) return result.value;
    this.reasons.push({ reasonKey: result.reasonKey, params: result.params });
    return null;
  }

  fail(reasonKey: string, params?: Record<string, string | number>) {
    this.reasons.push({ reasonKey, params });
  }

  get isValid() {
    return this.reasons.length === 0;
  }
}
