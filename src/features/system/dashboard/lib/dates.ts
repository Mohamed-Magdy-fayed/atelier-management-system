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
 * `YYYY-MM-DD` in the server's local calendar.
 *
 * `toISOString().slice(0, 10)` renders the UTC calendar day, which rolls the
 * date back by one on any server east of UTC (Cairo is UTC+2/+3). The
 * `expenses.date` column is a Postgres DATE, so it must be compared against a
 * local-calendar string or the window lands a day early.
 */
export function toLocalDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Start of the "all time" window. The atelier has no records before this date,
 * so pairing it with `endOfDay(now)` covers every row while still going through
 * the same bounded `from`/`to` path as every other preset — no special-casing in
 * `parseDashboardRange` or the queries.
 */
export const ALL_TIME_RANGE_START = new Date(2000, 0, 1, 0, 0, 0, 0);

export function parseDashboardRange(
  params: { from?: string; to?: string } | undefined,
  ctx: DashboardDateContext,
) {
  const parsedFrom = params?.from ? new Date(params.from) : null;
  const parsedTo = params?.to ? new Date(params.to) : null;

  let rangeStart =
    !parsedFrom || Number.isNaN(parsedFrom.getTime())
      ? ctx.defaultRangeStart
      : startOfDay(parsedFrom);
  let rangeEnd =
    !parsedTo || Number.isNaN(parsedTo.getTime())
      ? ctx.defaultRangeEnd
      : endOfDay(parsedTo);

  if (rangeStart > rangeEnd) {
    const swapStart = rangeStart;
    rangeStart = startOfDay(rangeEnd);
    rangeEnd = endOfDay(swapStart);
  }

  return { rangeStart, rangeEnd } as const;
}

export { endOfDay, startOfDay, subDays };
