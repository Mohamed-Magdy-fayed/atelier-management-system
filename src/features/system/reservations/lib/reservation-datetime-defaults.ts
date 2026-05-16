/** Start of calendar day in local time. */
export function startOfLocalDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Apply calendar day from `day` while keeping clock time from `timeSource`. */
export function mergeLocalDay(day: Date, timeSource: Date): Date {
  const merged = new Date(timeSource);
  merged.setFullYear(day.getFullYear(), day.getMonth(), day.getDate());
  return merged;
}

/** Default pickup/return times aligned with legacy dress-rental booking. */
export const DEFAULT_RECEIVING_HOUR = 17;
export const DEFAULT_RECEIVING_MINUTE = 0;
export const DEFAULT_RETURN_HOUR = 13;
export const DEFAULT_RETURN_MINUTE = 0;

export function setLocalTime(
  date: Date,
  hours: number,
  minutes: number,
): Date {
  const d = new Date(date);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

export function buildDefaultReservationDatetimes(base = new Date()) {
  const occasionDate = startOfLocalDay(base);
  const receivingDateTime = setLocalTime(
    occasionDate,
    DEFAULT_RECEIVING_HOUR,
    DEFAULT_RECEIVING_MINUTE,
  );
  const returnDateTime = setLocalTime(
    new Date(
      occasionDate.getFullYear(),
      occasionDate.getMonth(),
      occasionDate.getDate() + 1,
    ),
    DEFAULT_RETURN_HOUR,
    DEFAULT_RETURN_MINUTE,
  );
  return { occasionDate, receivingDateTime, returnDateTime };
}

export function syncReceivingReturnFromOccasion(
  occasionDate: Date,
  receivingDateTime: Date,
  returnDateTime: Date,
) {
  const receiving = mergeLocalDay(occasionDate, receivingDateTime);
  const returnBase = new Date(occasionDate);
  returnBase.setDate(returnBase.getDate() + 1);
  const returnDateTimeNext = mergeLocalDay(returnBase, returnDateTime);
  return { receivingDateTime: receiving, returnDateTime: returnDateTimeNext };
}
