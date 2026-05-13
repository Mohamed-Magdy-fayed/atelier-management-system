import { z } from "zod";

export const productListFilterInput = z.object({
  sorting: z.array(z.object({ id: z.string(), desc: z.boolean() })).default([]),
  globalFilter: z.string().optional(),
  columnFilters: z
    .array(z.object({ id: z.string(), value: z.unknown() }))
    .default([]),
});

export const listProductsInput = z.object({
  page: z.number().int().min(1).default(1),
  perPage: z.number().int().min(1).max(100).default(20),
  sorting: productListFilterInput.shape.sorting,
  globalFilter: productListFilterInput.shape.globalFilter,
  columnFilters: productListFilterInput.shape.columnFilters,
});

export const exportProductsInput = productListFilterInput;

export const productImportRowSchema = z.record(z.string(), z.unknown());

export const previewProductsImportInput = z.object({
  headers: z.array(z.string()).max(256),
  rows: z.array(productImportRowSchema).max(5_000),
});

export const commitProductsImportInput = z.object({
  rows: z
    .array(
      z.object({
        rowNumber: z.number().int().min(1),
        raw: productImportRowSchema,
      }),
    )
    .min(1)
    .max(5_000),
});

export const productMutationSchema = z.object({
  code: z.string().trim().min(1).max(32),
  nameEn: z.string().trim().min(1).max(128),
  nameAr: z.string().trim().min(1).max(128),
  price: z.number().int().min(0).max(10_000_000),
  isActive: z.boolean(),
});

export const productUpdateSchema = productMutationSchema.extend({
  id: z.string().uuid(),
});

export const productDeleteSchema = z.object({
  id: z.string().uuid(),
});

export const productSetActiveSchema = z.object({
  id: z.string().uuid(),
  isActive: z.boolean(),
});

export const productBulkSetActiveSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
  isActive: z.boolean(),
});

export const productBulkArchiveSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
});

export type ProductListFilterInput = z.infer<typeof productListFilterInput>;
export type ListProductsInput = z.infer<typeof listProductsInput>;
export type ExportProductsInput = z.infer<typeof exportProductsInput>;
export type PreviewProductsImportInput = z.infer<typeof previewProductsImportInput>;
export type CommitProductsImportInput = z.infer<typeof commitProductsImportInput>;
export type ProductMutationInput = z.infer<typeof productMutationSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
export type ProductDeleteInput = z.infer<typeof productDeleteSchema>;
export type ProductSetActiveInput = z.infer<typeof productSetActiveSchema>;
export type ProductBulkSetActiveInput = z.infer<typeof productBulkSetActiveSchema>;
export type ProductBulkArchiveInput = z.infer<typeof productBulkArchiveSchema>;
