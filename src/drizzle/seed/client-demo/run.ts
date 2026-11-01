import { eq } from "drizzle-orm";

import { db } from "@/drizzle";
import { BranchesTable, DressesTable, SettingsTable } from "@/drizzle/schema";
import { SYSTEM_SETTING_CODE } from "@/features/system/settings/lib/system-settings-registry";

import { getDatabaseHostname } from "../clear-db";
import { SEED_SYSTEM_ACTOR } from "../constants";
import { DEMO_BRANCHES } from "../demo/fixtures";
import { demoId } from "../demo/ids";
import { seedDemoDataset } from "../demo/run";
import { type ClientDemoManifest, loadClientDemoManifest } from "./manifest";

/**
 * Refuses any database but the one provisioned for this demo.
 *
 * Every client demo has its own Neon project, and the skill that creates it
 * passes the endpoint id it got back in `DEMO_NEON_ENDPOINT_ID`. Matching the
 * connection's host against that id — rather than against a host list — means a
 * stale `DATABASE_URL` in the shell, or a dotenv file pointing at a live
 * client's database, fails here instead of being overwritten.
 */
function assertClientDemoTarget(): void {
  const expected = process.env.DEMO_NEON_ENDPOINT_ID?.trim();
  if (!expected) {
    throw new Error(
      "DEMO_NEON_ENDPOINT_ID is required: the endpoint id of the demo's own Neon project.",
    );
  }

  // Neon hosts read `<endpoint>[-pooler].<region>.aws.neon.tech`.
  const [label] = getDatabaseHostname().split(".");
  const endpoint = label?.replace(/-pooler$/, "");
  if (endpoint !== expected) {
    throw new Error(
      `DATABASE_URL points at endpoint "${endpoint}", not the demo's "${expected}". Refusing to seed.`,
    );
  }
}

async function applyBranding(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  manifest: ClientDemoManifest,
) {
  const values: Array<[string, string | null]> = [
    [SYSTEM_SETTING_CODE.BRAND_NAME_EN, manifest.nameEn],
    [SYSTEM_SETTING_CODE.BRAND_NAME_AR, manifest.nameAr],
    [SYSTEM_SETTING_CODE.BRAND_LOGO_URL, manifest.logoUrl],
    [SYSTEM_SETTING_CODE.BRAND_PRIMARY_COLOR, manifest.brandColor ?? null],
  ];

  // The rows exist already: `seedDemoDataset` upserts every default setting.
  for (const [code, value] of values) {
    await tx
      .update(SettingsTable)
      .set({ value, updatedBy: SEED_SYSTEM_ACTOR })
      .where(eq(SettingsTable.code, code));
  }
}

/**
 * Seeds a demo for one prospect: the full `demo` dataset, then the prospect's
 * identity laid over it.
 *
 * Only names, images and colours are overlaid. Prices, statuses and every
 * reservation stay as the `demo` profile built them, so the money invariant
 * documented in `docs/seeding-and-demo-data.md` still holds.
 */
export async function seedClientDemoDataset(manifestPath: string) {
  const manifest = await loadClientDemoManifest(manifestPath);
  assertClientDemoTarget();

  // `seedDemoDataset` creates the admin through the `admin` profile, which
  // reads its email from here. The password comes from the caller's env only.
  process.env.SEED_ADMIN_EMAIL = manifest.adminEmail;

  const result = await seedDemoDataset();

  await db.transaction(async (tx) => {
    await applyBranding(tx, manifest);

    for (const [index, branch] of manifest.branches.entries()) {
      await tx
        .update(BranchesTable)
        .set({ nameEn: branch.nameEn, nameAr: branch.nameAr })
        .where(eq(BranchesTable.id, DEMO_BRANCHES[index].id));
    }

    // Ranks 0–5 of the main branch are its most-booked dresses.
    for (const [rank, dress] of manifest.dresses.entries()) {
      await tx
        .update(DressesTable)
        .set({
          title: dress.title,
          color: dress.color,
          images: [dress.imageUrl],
          ...(dress.description && { description: dress.description }),
        })
        .where(eq(DressesTable.id, demoId("dress", `0:${rank}`)));
    }
  });

  console.info(
    'Client demo "%s" branded as %s / %s.',
    manifest.slug,
    manifest.nameEn,
    manifest.nameAr,
  );

  return result;
}
