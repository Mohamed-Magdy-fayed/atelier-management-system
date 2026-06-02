import { db } from "@/drizzle";
import { SettingsTable } from "@/drizzle/schema";
import { SYSTEM_SETTINGS } from "@/features/system/settings/lib/system-settings-registry";

import { SEED_SYSTEM_ACTOR } from "./constants";

type DbClient = Pick<typeof db, "insert" | "update" | "delete" | "query">;

/**
 * Upsert all system settings from the registry.
 * Safe to call repeatedly — uses code as the conflict target.
 */
export async function seedDefaultSettings(
  tx: DbClient,
  createdBy: string,
): Promise<void> {
  for (const def of SYSTEM_SETTINGS) {
    await tx
      .insert(SettingsTable)
      .values({
        code: def.code,
        label: def.label,
        description: def.descriptionEn,
        isActive: def.seed.isActive,
        value: def.seed.value ?? null,
        amount: def.seed.amount ?? null,
        createdBy,
      })
      .onConflictDoUpdate({
        target: SettingsTable.code,
        set: {
          label: def.label,
          description: def.descriptionEn,
        },
      });
  }
}

/** Profile runner: upsert settings without clearing other tables. */
export async function seedSettingsProfile() {
  await seedDefaultSettings(db, SEED_SYSTEM_ACTOR);
  return { profile: "settings" as const };
}
