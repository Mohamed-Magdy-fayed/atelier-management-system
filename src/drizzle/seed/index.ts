import {
  DEFAULT_SEED_PROFILE,
  SEED_ADMIN_EMAIL,
  SEED_ADMIN_ID,
  SEED_ADMIN_PASSWORD,
  SEED_SYSTEM_ACTOR,
  type SeedProfileName,
} from "./constants";
import { seedBaselineProfile } from "./profiles/baseline";
import { seedDemoProfile } from "./profiles/demo";
import { seedPerformanceProfile } from "./profiles/performance";
import { seedSettingsProfile } from "./profiles/settings";

const profileRunners: Record<
  SeedProfileName,
  () => Promise<{ profile: SeedProfileName }>
> = {
  settings: seedSettingsProfile,
  baseline: seedBaselineProfile,
  demo: seedDemoProfile,
  performance: seedPerformanceProfile,
};

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
  console.info('Seed completed (profile: "%s").', result.profile);
  return result;
}

export async function seedAll() {
  return runSeedProfile("demo");
}
