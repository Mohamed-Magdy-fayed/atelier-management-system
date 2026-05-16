import { z } from "zod";

export const listSettingsInput = z.object({
  page: z.number().int().min(1).default(1),
  perPage: z.number().int().min(1).max(100).default(20),
  sorting: z.array(z.object({ id: z.string(), desc: z.boolean() })).default([]),
  globalFilter: z.string().optional(),
});

export const settingUpdateSchema = z.object({
  id: z.string().uuid(),
  isActive: z.boolean().nullable().optional(),
  value: z.string().trim().max(8000).optional().nullable(),
  amount: z.number().int().min(0).max(10_000_000).optional().nullable(),
});

export const settingSetActiveSchema = z.object({
  id: z.string().uuid(),
  isActive: z.boolean(),
});

export const settingBulkSetActiveSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
  isActive: z.boolean(),
});

export type ListSettingsInput = z.infer<typeof listSettingsInput>;
export type SettingUpdateInput = z.infer<typeof settingUpdateSchema>;
export type SettingSetActiveInput = z.infer<typeof settingSetActiveSchema>;
export type SettingBulkSetActiveInput = z.infer<typeof settingBulkSetActiveSchema>;
