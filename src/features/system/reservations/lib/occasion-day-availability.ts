export type OccasionBlockedRange = {
  start: Date;
  end: Date;
};

/** Match legacy `isDateReserved` for the occasion calendar. */
export function isOccasionDayBlocked(
  calendarDay: Date,
  ranges: OccasionBlockedRange[],
  timeReference?: Date,
): boolean {
  const target = new Date(calendarDay);
  const ref = timeReference ?? calendarDay;
  target.setHours(ref.getHours(), ref.getMinutes(), 0, 0);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  if (target < todayStart) {
    return true;
  }

  return ranges.some((range) => target >= range.start && target < range.end);
}
