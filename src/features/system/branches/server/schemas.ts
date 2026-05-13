import { z } from "zod";

export const listBranchesInput = z.object({
  page: z.number().int().min(1).default(1),
  perPage: z.number().int().min(1).max(100).default(20),
  sorting: z.array(z.object({ id: z.string(), desc: z.boolean() })).default([]),
  globalFilter: z.string().optional(),
});

export const branchMutationSchema = z.object({
  nameEn: z.string().trim().min(1).max(128),
  nameAr: z.string().trim().min(1).max(128),
});

export const branchUpdateSchema = branchMutationSchema.extend({
  id: z.string().uuid(),
});

export const branchDeleteSchema = z.object({
  id: z.string().uuid(),
});

export type ListBranchesInput = z.infer<typeof listBranchesInput>;
export type BranchMutationInput = z.infer<typeof branchMutationSchema>;
export type BranchUpdateInput = z.infer<typeof branchUpdateSchema>;
export type BranchDeleteInput = z.infer<typeof branchDeleteSchema>;
