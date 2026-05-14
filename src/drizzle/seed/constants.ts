export const SEED_SYSTEM_ACTOR = "system:seed";
export const SEED_ADMIN_EMAIL = "root@mail.com";
export const SEED_ADMIN_PASSWORD = "Make.1234";
export const SEED_ADMIN_ID = "00000000-0000-0000-0000-000000000001";

export const SEED_PROFILE_NAMES = ["baseline", "demo", "performance"] as const;

export type SeedProfileName = (typeof SEED_PROFILE_NAMES)[number];

export const DEFAULT_SEED_PROFILE: SeedProfileName = "demo";
