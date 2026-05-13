import { clearDb } from "@/drizzle/seed/clear-db";

import {
  DEFAULT_SEED_PROFILE,
  type SeedProfileName,
  SEED_ADMIN_EMAIL,
  SEED_ADMIN_ID,
  SEED_ADMIN_PASSWORD,
  SEED_SYSTEM_ACTOR,
} from "./constants";
import { seedBaselineProfile } from "./profiles/baseline";
import { seedDemoProfile } from "./profiles/demo";
import { seedPerformanceProfile } from "./profiles/performance";

const profileRunners = {
  baseline: seedBaselineProfile,
  demo: seedDemoProfile,
  performance: seedPerformanceProfile,
} satisfies Record<SeedProfileName, () => Promise<{
  profile: SeedProfileName;
  seededCustomerCount: number;
  seededEmployees: Array<{ id: string }>;
}>>;

export {
  DEFAULT_SEED_PROFILE,
  SEED_ADMIN_EMAIL,
  SEED_ADMIN_ID,
  SEED_ADMIN_PASSWORD,
  SEED_SYSTEM_ACTOR,
  type SeedProfileName,
};

export async function runSeedProfile(
  profile: SeedProfileName = DEFAULT_SEED_PROFILE,
) {
  await clearDb();
  const result = await profileRunners[profile]();
  console.info(
    `Seed profile "${result.profile}" summary: ${result.seededCustomerCount} customers, ${result.seededEmployees.length} employees.`,
  );
  return result;
}

export async function seedAll() {
  return runSeedProfile(DEFAULT_SEED_PROFILE);
}
