import "server-only";

import { inArray } from "drizzle-orm";
import { cache } from "react";

import { db } from "@/drizzle";
import { SettingsTable } from "@/drizzle/schema";
import { env } from "@/env/server";
import type { Branding } from "@/features/system/settings/lib/branding";
import {
  BRANDING_SETTING_CODES,
  SYSTEM_SETTING_CODE,
} from "@/features/system/settings/lib/system-settings-registry";

/** Whether this deployment's contract includes client-editable branding. */
export function isBrandingEditable(): boolean {
  return env.BRANDING_EDITABLE === "1";
}

/**
 * Reads the three branding rows in one query.
 *
 * Wrapped in `cache()` because the root layout resolves branding for every
 * route: without it the same three rows would be fetched again by each server
 * component in the tree that needs the business name.
 */
export const getBranding = cache(async (): Promise<Branding> => {
  const rows = await db
    .select({ code: SettingsTable.code, value: SettingsTable.value })
    .from(SettingsTable)
    .where(inArray(SettingsTable.code, [...BRANDING_SETTING_CODES]));

  const byCode = new Map(rows.map((row) => [row.code, row.value?.trim() || null]));

  return {
    nameEn: byCode.get(SYSTEM_SETTING_CODE.BRAND_NAME_EN) ?? null,
    nameAr: byCode.get(SYSTEM_SETTING_CODE.BRAND_NAME_AR) ?? null,
    logoUrl: byCode.get(SYSTEM_SETTING_CODE.BRAND_LOGO_URL) ?? null,
  };
});
