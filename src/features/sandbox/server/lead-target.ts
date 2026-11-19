import "server-only";

import { inArray } from "drizzle-orm";

import type { db as database } from "@/drizzle";
import { SettingsTable } from "@/drizzle/schema";
import {
  DEFAULT_GATELING_LEAD_URL,
  SYSTEM_SETTING_CODE,
} from "@/features/system/settings/lib/system-settings-registry";
import { decryptSecret } from "@/features/system/settings/server/secret-crypto";

type DbClient = Pick<typeof database, "select">;

export type LeadTarget = { url: string; key: string } | null;

/**
 * Where to forward sign-up leads, read from the Settings page (the key is
 * stored encrypted). Null when no key has been saved yet, or when it cannot be
 * decrypted: the form then falls back to the WhatsApp message.
 */
export async function resolveLeadTarget(db: DbClient): Promise<LeadTarget> {
  const rows = await db
    .select({ code: SettingsTable.code, value: SettingsTable.value })
    .from(SettingsTable)
    .where(
      inArray(SettingsTable.code, [
        SYSTEM_SETTING_CODE.GATELING_LEAD_URL,
        SYSTEM_SETTING_CODE.GATELING_LEAD_KEY,
      ]),
    );
  const byCode = new Map(rows.map((row) => [row.code, row.value]));

  const stored = byCode.get(SYSTEM_SETTING_CODE.GATELING_LEAD_KEY)?.trim();
  if (!stored) return null;

  let key: string;
  try {
    key = decryptSecret(stored);
  } catch {
    return null;
  }
  if (!key) return null;

  const url =
    byCode.get(SYSTEM_SETTING_CODE.GATELING_LEAD_URL)?.trim() ||
    DEFAULT_GATELING_LEAD_URL;
  if (!/^https:\/\//i.test(url)) return null;

  return { url, key };
}
