/**
 * Coercion helpers for date values that cross the form boundary.
 *
 * Form state holds dates either as `Date` objects (reservations) or as
 * date-only `"YYYY-MM-DD"` strings (expenses, anything backed by a Postgres
 * `date` column). Date pickers only speak `Date`, so both directions need a
 * conversion that never produces an `Invalid Date`.
 */

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

/** Coerce an unknown value to a valid `Date`, or `undefined` if it isn't one. */
export function toDate(value: unknown): Date | undefined {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value;
  }

  if (typeof value === "number") {
    const fromEpoch = new Date(value);
    return Number.isNaN(fromEpoch.getTime()) ? undefined : fromEpoch;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return undefined;

    // Date-only strings must be read in local time. `new Date("2026-08-06")`
    // parses as UTC midnight, which renders as the previous day west of UTC.
    const dateOnly = DATE_ONLY_PATTERN.exec(trimmed);
    if (dateOnly) {
      const [, year, month, day] = dateOnly;
      const local = new Date(Number(year), Number(month) - 1, Number(day));
      return Number.isNaN(local.getTime()) ? undefined : local;
    }

    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  return undefined;
}

/** Serialize a `Date` back to a local-time `"YYYY-MM-DD"` string. */
export function toDateOnlyString(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
