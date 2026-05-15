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

export type RentalCustomerListFilterInput = z.infer<
  typeof rentalCustomerListFilterInput
>;
export type ListRentalCustomersInput = z.infer<typeof listRentalCustomersInput>;
export type ExportRentalCustomersInput = z.infer<
  typeof exportRentalCustomersInput
>;
