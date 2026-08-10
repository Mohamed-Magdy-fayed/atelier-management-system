import { DEFAULT_BUSINESS_TIMEZONE } from "@/features/system/settings/lib/system-settings-registry";

export type DashboardDateContext = {
  now: Date;
  todayStart: Date;
  todayEnd: Date;
  defaultRangeStart: Date;
  defaultRangeEnd: Date;
  currentMonthStart: Date;
  currentMonthEnd: Date;
  previousMonthStart: Date;
  previousMonthEnd: Date;
  currentWeekStart: Date;
  currentWeekEnd: Date;
  previousWeekStart: Date;
  previousWeekEnd: Date;
  upcomingWindowEnd: Date;
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function subDays(d: Date, days: number) {
  return addDays(d, -days);
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

function subMonths(d: Date, months: number) {
  return new Date(d.getFullYear(), d.getMonth() - months, d.getDate());
}

function startOfWeek(d: Date) {
  const x = startOfDay(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

function endOfWeek(d: Date) {
  const x = startOfWeek(d);
  x.setDate(x.getDate() + 6);
  return endOfDay(x);
}

export function buildDashboardDateContext(
  now = new Date(),
): DashboardDateContext {
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const currentWeekStart = startOfWeek(now);
  const currentWeekEnd = endOfWeek(now);

  return {
    now,
    todayStart,
    todayEnd,
    defaultRangeStart: startOfDay(subDays(now, 29)),
    defaultRangeEnd: endOfDay(now),
    currentMonthStart: startOfMonth(now),
    currentMonthEnd: endOfMonth(now),
    previousMonthStart: startOfMonth(subMonths(now, 1)),
    previousMonthEnd: endOfMonth(subMonths(now, 1)),
    currentWeekStart,
    currentWeekEnd,
    previousWeekStart: subDays(currentWeekStart, 7),
    previousWeekEnd: subDays(currentWeekEnd, 7),
    upcomingWindowEnd: addDays(now, 7),
  };
}

/**
 * `YYYY-MM-DD` in the atelier's calendar, not the server's.
 *
 * `toISOString().slice(0, 10)` renders the UTC calendar day, which rolls the
 * date back by one for any instant east of UTC (Cairo is UTC+2/+3), and
 * `getFullYear()/getMonth()/getDate()` render the *deploy host's* calendar —
 * Cairo on a dev laptop, UTC on Vercel, so the same range produced two
 * different windows depending on where it ran. The `expenses.date` column is a
 * Postgres DATE, so it is pinned to the business timezone explicitly.
 */
const businessDayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: DEFAULT_BUSINESS_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function toLocalDateString(date: Date) {
  // en-CA renders as YYYY-MM-DD, which is exactly the DATE literal Postgres wants.
  return businessDayFormatter.format(date);
}

/**
 * Start of the "all time" window. The atelier has no records before this date,
 * so pairing it with `endOfDay(now)` covers every row while still going through
 * the same bounded `from`/`to` path as every other preset — no special-casing in
 * `parseDashboardRange` or the queries.
 */
export const ALL_TIME_RANGE_START = new Date(2000, 0, 1, 0, 0, 0, 0);

/**
 * The client sends each bound as a full ISO instant it already anchored to the
 * *user's* midnight (see `buildRangeParams`). Re-flooring that instant with
 * `startOfDay` would re-anchor it to the server's calendar, and on a UTC host
 * a Cairo "yesterday" (21:00Z→20:59Z) then widened into a ~48h window: the
 * dashboard counted money the /payments grid — which windows on the real day —
 * correctly left out. Only a bare `YYYY-MM-DD`, which carries no instant of its
 * own, still gets day boundaries applied here.
 */
function parseBound(raw: string, mode: "start" | "end"): Date | null {
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  if (raw.includes("T")) return parsed;
  return mode === "start" ? startOfDay(parsed) : endOfDay(parsed);
}

export function parseDashboardRange(
  params: { from?: string; to?: string } | undefined,
  ctx: DashboardDateContext,
) {
  const parsedFrom = params?.from ? parseBound(params.from, "start") : null;
  const parsedTo = params?.to ? parseBound(params.to, "end") : null;

  let rangeStart = parsedFrom ?? ctx.defaultRangeStart;
  let rangeEnd = parsedTo ?? ctx.defaultRangeEnd;

  if (rangeStart > rangeEnd) {
    const swapStart = rangeStart;
    rangeStart = startOfDay(rangeEnd);
    rangeEnd = endOfDay(swapStart);
  }

  return { rangeStart, rangeEnd } as const;
}

export { endOfDay, startOfDay, subDays };
