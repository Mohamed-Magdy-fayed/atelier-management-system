import { z } from "zod";

export const paymentListFilterInput = z.object({
  sorting: z.array(z.object({ id: z.string(), desc: z.boolean() })).default([]),
  globalFilter: z.string().optional(),
  columnFilters: z
    .array(z.object({ id: z.string(), value: z.unknown() }))
    .default([]),
  branchId: z.string().uuid().optional(),
});

export const listPaymentsInput = z.object({
  page: z.number().int().min(1).default(1),
  perPage: z.number().int().min(1).max(100).default(20),
  sorting: paymentListFilterInput.shape.sorting,
  globalFilter: paymentListFilterInput.shape.globalFilter,
  columnFilters: paymentListFilterInput.shape.columnFilters,
  branchId: paymentListFilterInput.shape.branchId,
});

export const exportPaymentsInput = paymentListFilterInput;

export type PaymentListFilterInput = z.infer<typeof paymentListFilterInput>;
export type ListPaymentsInput = z.infer<typeof listPaymentsInput>;
export type ExportPaymentsInput = z.infer<typeof exportPaymentsInput>;
