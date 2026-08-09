import {
  DEFAULT_SEED_PROFILE,
  SEED_ADMIN_EMAIL,
  SEED_ADMIN_ID,
  SEED_ADMIN_PASSWORD,
  SEED_SYSTEM_ACTOR,
  type SeedProfileName,
} from "./constants";
import { seedAdminProfile } from "./profiles/admin";
import { seedBaselineProfile } from "./profiles/baseline";
import { seedDemoProfile } from "./profiles/demo";
import { seedPerformanceProfile } from "./profiles/performance";
import { seedSettingsProfile } from "./profiles/settings";

const profileRunners = {
  settings: seedSettingsProfile,
  admin: seedAdminProfile,
  baseline: seedBaselineProfile,
  demo: seedDemoProfile,
  performance: seedPerformanceProfile,
} satisfies Record<
  SeedProfileName,
  () => Promise<{
    profile: SeedProfileName;
    seededCustomerCount: number;
    seededEmployees: Array<{ id: string }>;
  }>
>;

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
  const result = await profileRunners[profile]();
  console.info('Seed profile "%s" finished.', result.profile);
  return result;
}

export async function seedAll() {
  return runSeedProfile(DEFAULT_SEED_PROFILE);
}
