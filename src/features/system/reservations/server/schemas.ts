import { z } from "zod";

import { paymentMethods } from "@/drizzle/schemas/system/payments-table";
import { reservationStatuses } from "@/drizzle/schemas/system/reservations-table";

const reservationStatusSchema = z.enum(reservationStatuses);
const paymentMethodSchema = z.enum(paymentMethods);

export const reservationListFilterInput = z.object({
  sorting: z.array(z.object({ id: z.string(), desc: z.boolean() })).default([]),
  globalFilter: z.string().optional(),
  columnFilters: z
    .array(z.object({ id: z.string(), value: z.unknown() }))
    .default([]),
  branchId: z.string().uuid().optional(),
});

export const listReservationsInput = z.object({
  page: z.number().int().min(1).default(1),
  perPage: z.number().int().min(1).max(100).default(20),
  sorting: reservationListFilterInput.shape.sorting,
  globalFilter: reservationListFilterInput.shape.globalFilter,
  columnFilters: reservationListFilterInput.shape.columnFilters,
  branchId: reservationListFilterInput.shape.branchId,
});

export const exportReservationsInput = reservationListFilterInput;

export const reservationByIdSchema = z.object({
  id: z.string().uuid(),
});

export const reservationFormDataSchema = z.object({
  /** Omit when the admin views all branches; dresses from every branch are returned. */
  branchId: z.string().uuid().optional(),
});

export const reservationGenerateCodeSchema = z.object({
  branchId: z.string().uuid(),
  branchName: z.string().trim().min(1),
});

const reservationFinancialFields = {
  discount: z.number().int().min(0).max(10_000_000).default(0),
  depositPaid: z.number().int().min(0).max(10_000_000),
  notes: z.string().trim().max(4000).optional(),
};

export const reservationMutationSchema = z.object({
  branchId: z.string().uuid(),
  dressId: z.string().uuid(),
  customerId: z.string().uuid().optional(),
  reservationCode: z.string().trim().min(1).max(128).optional(),
  customerName: z.string().trim().min(1).max(255),
  customerPhone: z.string().trim().min(1).max(32),
  receivingDateTime: z.coerce.date(),
  occasionDate: z.coerce.date(),
  returnDateTime: z.coerce.date(),
  status: reservationStatusSchema,
  paymentMethod: paymentMethodSchema,
  ...reservationFinancialFields,
});

export const reservationUpdateSchema = z.object({
  id: z.string().uuid(),
  branchId: z.string().uuid(),
  dressId: z.string().uuid(),
  customerId: z.string().uuid(),
  reservationCode: z.string().trim().min(1).max(128),
  customerName: z.string().trim().min(1).max(255),
  customerPhone: z.string().trim().max(32).optional(),
  receivingDateTime: z.coerce.date(),
  occasionDate: z.coerce.date(),
  returnDateTime: z.coerce.date(),
  totalPrice: z.number().int().min(0).max(10_000_000),
  status: reservationStatusSchema,
  discount: z.number().int().min(0).max(10_000_000).default(0),
  depositPaid: z.number().int().min(0).max(10_000_000),
  notes: z.string().trim().max(4000).optional(),
});

export const reservationUpdateStatusSchema = z.object({
  id: z.string().uuid(),
  status: reservationStatusSchema,
});

export const reservationCollectPaymentSchema = z.object({
  reservationId: z.string().uuid(),
  amount: z.number().int().min(1),
  paymentMethod: paymentMethodSchema,
  note: z.string().trim().max(500).optional(),
});

export const reservationDeleteSchema = z.object({
  id: z.string().uuid(),
});

export const dressOccasionBlockedRangesSchema = z.object({
  dressId: z.string().uuid(),
  branchId: z.string().uuid().optional(),
  excludeReservationId: z.string().uuid().optional(),
});

export const reservationBulkUpdateStatusSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
  status: reservationStatusSchema,
});

export const reservationBulkDeleteSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
});

export type ReservationListFilterInput = z.infer<
  typeof reservationListFilterInput
>;
export type ListReservationsInput = z.infer<typeof listReservationsInput>;
export type ExportReservationsInput = z.infer<typeof exportReservationsInput>;
export type ReservationByIdInput = z.infer<typeof reservationByIdSchema>;
export type ReservationFormDataInput = z.infer<
  typeof reservationFormDataSchema
>;
export type ReservationGenerateCodeInput = z.infer<
  typeof reservationGenerateCodeSchema
>;
export type ReservationMutationInput = z.infer<
  typeof reservationMutationSchema
>;
export type ReservationUpdateInput = z.infer<typeof reservationUpdateSchema>;
export type ReservationUpdateStatusInput = z.infer<
  typeof reservationUpdateStatusSchema
>;
export type ReservationCollectPaymentInput = z.infer<
  typeof reservationCollectPaymentSchema
>;
export type ReservationDeleteInput = z.infer<typeof reservationDeleteSchema>;
export type DressOccasionBlockedRangesInput = z.infer<
  typeof dressOccasionBlockedRangesSchema
>;
export type ReservationBulkUpdateStatusInput = z.infer<
  typeof reservationBulkUpdateStatusSchema
>;
export type ReservationBulkDeleteInput = z.infer<
  typeof reservationBulkDeleteSchema
>;
