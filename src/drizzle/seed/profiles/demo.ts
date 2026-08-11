import { seedDemoDataset } from "../demo/run";

/**
 * Curated, publication-safe atelier for screen recordings and live sales
 * demos. The dataset itself lives in `src/drizzle/seed/demo/`.
 */
export async function seedDemoProfile() {
  const { seededCustomerCount, seededEmployees } = await seedDemoDataset();

  return {
    profile: "demo" as const,
    seededCustomerCount,
    seededEmployees,
  };
}
