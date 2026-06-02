import "server-only";

import { NEXT_AVAILABLE_SCAN_DAYS } from "./constants";
import {
  addDaysToCalendarDate,
  dressHasBlockingReservationOnCalendarDay,
} from "./queries";

export async function isDressAvailableOnCalendarDay(
  dressId: string,
  dateStr: string,
): Promise<boolean> {
  const blocked = await dressHasBlockingReservationOnCalendarDay(
    dressId,
    dateStr,
  );
  return !blocked;
}

export async function findNextAvailableCalendarDay(
  dressId: string,
  fromDateStr: string,
  maxDays = NEXT_AVAILABLE_SCAN_DAYS,
): Promise<string | null> {
  for (let i = 0; i < maxDays; i++) {
    const candidate = addDaysToCalendarDate(fromDateStr, i);
    if (!(await dressHasBlockingReservationOnCalendarDay(dressId, candidate))) {
      return candidate;
    }
  }
  return null;
}
