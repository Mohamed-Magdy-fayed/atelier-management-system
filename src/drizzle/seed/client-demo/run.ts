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
 * Generic branch names a leftover demo branch may take. Used only when its own
 * name shares a district with one of the client's branches — a demo showing
 * both "Heliopolis" and "Heliopolis Atelier" reads as a data bug.
 */
const SPARE_BRANCH_NAMES = [
  { nameEn: "Zamalek Atelier", nameAr: "أتيليه الزمالك", addressEn: "Zamalek, Cairo", addressAr: "الزمالك، القاهرة" },
  { nameEn: "New Cairo Atelier", nameAr: "أتيليه القاهرة الجديدة", addressEn: "Fifth Settlement, New Cairo", addressAr: "التجمع الخامس، القاهرة الجديدة" },
  { nameEn: "Maadi Atelier", nameAr: "أتيليه المعادي", addressEn: "Maadi, Cairo", addressAr: "المعادي، القاهرة" },
  { nameEn: "Sheikh Zayed Atelier", nameAr: "أتيليه الشيخ زايد", addressEn: "Sheikh Zayed, Giza", addressAr: "الشيخ زايد، الجيزة" },
] as const;

function sharesDistrict(name: string, manifest: ClientDemoManifest): boolean {
  const district = name.replace(/\s*Atelier$/i, "").toLowerCase();
  return manifest.branches.some((branch) => {
    const taken = `${branch.nameEn} ${branch.addressEn ?? ""}`.toLowerCase();
    return taken.includes(district);
  });
}

function pickSpareBranchName<T extends { nameEn: string }>(
  manifest: ClientDemoManifest,
  generic: T,
): T | (typeof SPARE_BRANCH_NAMES)[number] {
  if (!sharesDistrict(generic.nameEn, manifest)) return generic;
  return (
    SPARE_BRANCH_NAMES.find((spare) => !sharesDistrict(spare.nameEn, manifest)) ??
    generic
  );
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
  // The CLI loads `.env.local`, which on a dev machine may set
  // SEED_ADMIN_RESET_PASSWORD=1 for local convenience. Inherited here, every
  // re-seed would silently replace the password the prospect was given, so a
  // demo rotates it only when this run explicitly asks.
  process.env.SEED_ADMIN_RESET_PASSWORD =
    process.env.DEMO_ROTATE_PASSWORD === "1" ? "1" : "0";

  const result = await seedDemoDataset();

  await db.transaction(async (tx) => {
    await applyBranding(tx, manifest);

    for (const [index, branch] of manifest.branches.entries()) {
      await tx
        .update(BranchesTable)
        .set({
          nameEn: branch.nameEn,
          nameAr: branch.nameAr,
          // The generic demo address names a different district, which
          // contradicts the branch's new name.
          addressEn: branch.addressEn ?? branch.nameEn,
          addressAr: branch.addressAr ?? branch.nameAr,
        })
        .where(eq(BranchesTable.id, DEMO_BRANCHES[index].id));
    }

    for (const [index, generic] of DEMO_BRANCHES.entries()) {
      if (index < manifest.branches.length) continue;
      const spare = pickSpareBranchName(manifest, generic);
      if (spare === generic) continue;
      await tx
        .update(BranchesTable)
        .set(spare)
        .where(eq(BranchesTable.id, generic.id));
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
