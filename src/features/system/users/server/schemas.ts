import { z } from "zod";

import { userRoleValues } from "@/drizzle/schema";

export const listEmployeesInput = z.object({
  /** @deprecated Prefer `branchIds`. Kept for active-branch shortcuts. */
  branchId: z.string().uuid().optional(),
  /** Employees assigned to any of these branches are returned (OR). */
  branchIds: z.array(z.string().uuid()).optional(),
});

export const listCustomersInput = z.object({
  page: z.number().int().min(1).default(1),
  perPage: z.number().int().min(1).max(100).default(20),
  sorting: z.array(z.object({ id: z.string(), desc: z.boolean() })).default([]),
  globalFilter: z.string().optional(),
  columnFilters: z
    .array(z.object({ id: z.string(), value: z.unknown() }))
    .default([]),
});

export const listFilterInput = z.object({
  sorting: z.array(z.object({ id: z.string(), desc: z.boolean() })).default([]),
  globalFilter: z.string().optional(),
  columnFilters: z
    .array(z.object({ id: z.string(), value: z.unknown() }))
    .default([]),
});

export const exportRowsInput = listFilterInput.extend({
  role: z.enum(["customer", "employee"]).default("customer"),
});

export const importRoleSchema = z.enum(["customer", "employee"]);
export const userImportRowSchema = z.record(z.string(), z.unknown());

export const previewImportInput = z.object({
  role: importRoleSchema,
  headers: z.array(z.string()).max(256),
  rows: z.array(userImportRowSchema).max(5_000),
});

export const commitImportInput = z.object({
  role: importRoleSchema,
  rows: z
    .array(
      z.object({
        rowNumber: z.number().int().min(1),
        raw: userImportRowSchema,
      }),
    )
    .min(1)
    .max(5_000),
});

export const userBranchIdsSchema = z.array(z.string().uuid());

/** Audit dialogs resolve at most three actors (created/updated/deleted). */
export const resolveActorsInput = z.object({
  ids: z.array(z.string().uuid()).max(8),
});

export const userMutationSchema = z.object({
  name: z.string().trim().min(1).max(256).nullable().optional(),
  email: z.string().trim().email().max(256),
  phone: z.string().trim().max(16).nullable().optional(),
  age: z.number().int().min(0).max(150).nullable().optional(),
  role: z.enum(userRoleValues).default("customer"),
  /** @deprecated Prefer `branchIds`. Kept for single-branch create shortcuts. */
  branchId: z.string().uuid().optional(),
  branchIds: userBranchIdsSchema.optional(),
});

export const userIdInput = z.object({
  id: z.string().uuid(),
});

export const userUpdateSchema = userMutationSchema.extend({
  id: z.string().uuid(),
});
export const softDeleteInput = z.object({
  ids: z.array(z.string().uuid()).min(1),
});
export const bulkSetVerifiedInput = z.object({
  ids: z.array(z.string().uuid()).min(1),
  verified: z.boolean(),
});

export type ListEmployeesInput = z.infer<typeof listEmployeesInput>;
export type ListCustomersInput = z.infer<typeof listCustomersInput>;
export type ListFilterInput = z.infer<typeof listFilterInput>;
export type ExportRowsInput = z.infer<typeof exportRowsInput>;
export type PreviewImportInput = z.infer<typeof previewImportInput>;
export type CommitImportInput = z.infer<typeof commitImportInput>;
export type UserMutationInput = z.infer<typeof userMutationSchema>;
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;
export type UserIdInput = z.infer<typeof userIdInput>;
export type SoftDeleteInput = z.infer<typeof softDeleteInput>;
export type BulkSetVerifiedInput = z.infer<typeof bulkSetVerifiedInput>;
export type UserImportRole = z.infer<typeof importRoleSchema>;
export type ResolveActorsInput = z.infer<typeof resolveActorsInput>;
