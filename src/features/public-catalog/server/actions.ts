"use server";

import {
  findNextAvailableCalendarDay,
  isDressAvailableOnCalendarDay,
} from "@/features/public-catalog/server/availability";
import { NEXT_AVAILABLE_SCAN_DAYS } from "@/features/public-catalog/server/constants";
import { addDaysToCalendarDate } from "@/features/public-catalog/server/queries";
import { checkDressAvailabilityInputSchema } from "@/features/public-catalog/server/schemas";

export async function checkDressAvailabilityAction(raw: unknown) {
  const parsed = checkDressAvailabilityInputSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false as const, code: "invalid" as const };
  }

  const { dressId, date } = parsed.data;
  const available = await isDressAvailableOnCalendarDay(dressId, date);

  let nextAvailable: string | null = null;
  if (!available) {
    nextAvailable = await findNextAvailableCalendarDay(
      dressId,
      addDaysToCalendarDate(date, 1),
      NEXT_AVAILABLE_SCAN_DAYS,
    );
  }

  return { ok: true as const, available, nextAvailable };
}
