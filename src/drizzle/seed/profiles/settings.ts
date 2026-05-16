import { db } from "@/drizzle";

import { SEED_SYSTEM_ACTOR } from "../constants";
import { seedDefaultSettings } from "../settings";

/** Upsert default settings rows without clearing other tables. */
export async function seedSettingsProfile() {
  await seedDefaultSettings(db, SEED_SYSTEM_ACTOR);
  return {
    profile: "settings" as const,
    seededCustomerCount: 0,
    seededEmployees: [] as Array<{ id: string }>,
  };
}
