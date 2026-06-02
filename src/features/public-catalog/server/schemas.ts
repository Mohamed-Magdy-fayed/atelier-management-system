import { z } from "zod";

const calendarDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format");

export const checkDressAvailabilityInputSchema = z.object({
  dressId: z.uuid(),
  date: calendarDate,
});

export type CheckDressAvailabilityInput = z.infer<
  typeof checkDressAvailabilityInputSchema
>;
