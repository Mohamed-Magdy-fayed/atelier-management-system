/** `HH:mm` or `HH:mm:ss` from Postgres `time` → value for `<input type="time">`. */
export function toTimeInputValue(value: string | null | undefined): string {
  if (!value) return "";
  const match = /^(\d{2}:\d{2})/.exec(value.trim());
  return match?.[1] ?? "";
}

/** Form `HH:mm` → Postgres `time` string, or null when empty. */
export function toDbTime(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (/^\d{2}:\d{2}$/.test(trimmed)) return `${trimmed}:00`;
  if (/^\d{2}:\d{2}:\d{2}$/.test(trimmed)) return trimmed;
  return null;
}

function timePartsToDate(value: string): Date {
  const [hours, minutes] = value.split(":").map((part) => Number(part));
  const date = new Date();
  date.setHours(hours ?? 0, minutes ?? 0, 0, 0);
  return date;
}

/** Locale-aware opening hours label (single range, no duplicate EN/AR fields). */
export function formatBranchHours(
  opensAt: string | null | undefined,
  closesAt: string | null | undefined,
  locale: string,
): string | null {
  const open = toTimeInputValue(opensAt);
  const close = toTimeInputValue(closesAt);
  if (!open || !close) return null;

  const fmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en", {
    hour: "numeric",
    minute: "2-digit",
  });

  return `${fmt.format(timePartsToDate(open))} – ${fmt.format(timePartsToDate(close))}`;
}
