import { seedClientDemoDataset } from "../client-demo/run";

/**
 * A `demo` atelier wearing one prospect's name, logo, colour and dresses.
 * Reads the manifest path from `DEMO_MANIFEST` — see `docs/client-demos/PLAN.md`.
 */
export async function seedClientDemoProfile() {
  const manifestPath = process.env.DEMO_MANIFEST;
  if (!manifestPath) {
    throw new Error("DEMO_MANIFEST is required: the path to the demo manifest JSON.");
  }

  const { seededCustomerCount, seededEmployees } =
    await seedClientDemoDataset(manifestPath);

  return {
    profile: "client-demo" as const,
    seededCustomerCount,
    seededEmployees,
  };
}
