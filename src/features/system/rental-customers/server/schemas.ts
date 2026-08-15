import { z } from "zod";

export const rentalCustomerListFilterInput = z.object({
  sorting: z.array(z.object({ id: z.string(), desc: z.boolean() })).default([]),
  globalFilter: z.string().optional(),
  columnFilters: z
    .array(z.object({ id: z.string(), value: z.unknown() }))
    .default([]),
  branchId: z.string().uuid().optional(),
});

export const listRentalCustomersInput = z.object({
  page: z.number().int().min(1).default(1),
  perPage: z.number().int().min(1).max(100).default(20),
  sorting: rentalCustomerListFilterInput.shape.sorting,
  globalFilter: rentalCustomerListFilterInput.shape.globalFilter,
  columnFilters: rentalCustomerListFilterInput.shape.columnFilters,
  branchId: rentalCustomerListFilterInput.shape.branchId,
});

export const exportRentalCustomersInput = rentalCustomerListFilterInput;

/**
 * Correcting an existing walk-in record. There is no create/delete counterpart:
 * customers are still born from a reservation or a CSV import, and reservations
 * reference them, so removal is not offered from the grid.
 */
export const updateRentalCustomerInput = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(256),
  phone: z.string().trim().min(1).max(32),
  note: z.string().trim().max(1000).nullish(),
});

export type RentalCustomerListFilterInput = z.infer<
  typeof rentalCustomerListFilterInput
>;
export type ListRentalCustomersInput = z.infer<typeof listRentalCustomersInput>;
export type ExportRentalCustomersInput = z.infer<
  typeof exportRentalCustomersInput
>;
export type UpdateRentalCustomerInput = z.infer<
  typeof updateRentalCustomerInput
>;
