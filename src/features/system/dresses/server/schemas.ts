import { z } from "zod";

export const dressListFilterInput = z.object({
  sorting: z.array(z.object({ id: z.string(), desc: z.boolean() })).default([]),
  globalFilter: z.string().optional(),
  columnFilters: z
    .array(z.object({ id: z.string(), value: z.unknown() }))
    .default([]),
  branchId: z.string().uuid().optional(),
});

export const listDressesInput = z.object({
  page: z.number().int().min(1).default(1),
  perPage: z.number().int().min(1).max(100).default(20),
  sorting: dressListFilterInput.shape.sorting,
  globalFilter: dressListFilterInput.shape.globalFilter,
  columnFilters: dressListFilterInput.shape.columnFilters,
  branchId: dressListFilterInput.shape.branchId,
});

export const exportDressesInput = dressListFilterInput;

export const dressByIdSchema = z.object({
  id: z.string().uuid(),
});

export type DressByIdInput = z.infer<typeof dressByIdSchema>;

export const dressMutationSchema = z.object({
  branchId: z.string().uuid(),
  code: z.string().trim().min(1).max(128),
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().max(4000).optional(),
  size: z.string().trim().max(64).optional(),
  color: z.string().trim().max(64).optional(),
  pricePerDay: z.number().int().min(0).max(10_000_000),
  depositAmount: z.number().int().min(0).max(10_000_000),
  insurance: z.number().int().min(0).max(10_000_000),
  isActive: z.boolean(),
});

export const dressUpdateSchema = dressMutationSchema.extend({
  id: z.string().uuid(),
});

export const dressDeleteSchema = z.object({
  id: z.string().uuid(),
});

export const dressSetActiveSchema = z.object({
  id: z.string().uuid(),
  isActive: z.boolean(),
});

export const dressBulkSetActiveSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
  isActive: z.boolean(),
});

export const dressBulkArchiveSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
});

export type DressListFilterInput = z.infer<typeof dressListFilterInput>;
export type ListDressesInput = z.infer<typeof listDressesInput>;
export type ExportDressesInput = z.infer<typeof exportDressesInput>;
export type DressMutationInput = z.infer<typeof dressMutationSchema>;
export type DressUpdateInput = z.infer<typeof dressUpdateSchema>;
export type DressDeleteInput = z.infer<typeof dressDeleteSchema>;
export type DressSetActiveInput = z.infer<typeof dressSetActiveSchema>;
export type DressBulkSetActiveInput = z.infer<typeof dressBulkSetActiveSchema>;
export type DressBulkArchiveInput = z.infer<typeof dressBulkArchiveSchema>;
