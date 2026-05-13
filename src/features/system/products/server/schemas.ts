import { z } from "zod";

export const listProductsInput = z.object({
  page: z.number().int().min(1).default(1),
  perPage: z.number().int().min(1).max(100).default(20),
  sorting: z.array(z.object({ id: z.string(), desc: z.boolean() })).default([]),
  globalFilter: z.string().optional(),
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

export type ListProductsInput = z.infer<typeof listProductsInput>;
export type ProductMutationInput = z.infer<typeof productMutationSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
export type ProductDeleteInput = z.infer<typeof productDeleteSchema>;
