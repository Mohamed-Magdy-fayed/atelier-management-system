import { z } from "zod";

import { settingsLabels } from "@/drizzle/schemas/system/settings-table";

export const listSettingsInput = z.object({
  page: z.number().int().min(1).default(1),
  perPage: z.number().int().min(1).max(100).default(20),
  sorting: z.array(z.object({ id: z.string(), desc: z.boolean() })).default([]),
  globalFilter: z.string().optional(),
});

export const settingMutationSchema = z.object({
  code: z.string().trim().min(1).max(128),
  label: z.enum(settingsLabels),
  description: z.string().trim().max(4000).optional().nullable(),
  isActive: z.boolean().nullable(),
  value: z.string().trim().max(8000).optional().nullable(),
  amount: z.number().int().min(0).max(10_000_000).optional().nullable(),
});

export const settingUpdateSchema = z.object({
  id: z.string().uuid(),
  label: z.enum(settingsLabels),
  description: z.string().trim().max(4000).optional().nullable(),
  isActive: z.boolean().nullable(),
  value: z.string().trim().max(8000).optional().nullable(),
  amount: z.number().int().min(0).max(10_000_000).optional().nullable(),
});

export const settingDeleteSchema = z.object({
  id: z.string().uuid(),
});

export type ListSettingsInput = z.infer<typeof listSettingsInput>;
export type SettingMutationInput = z.infer<typeof settingMutationSchema>;
export type SettingUpdateInput = z.infer<typeof settingUpdateSchema>;
export type SettingDeleteInput = z.infer<typeof settingDeleteSchema>;
