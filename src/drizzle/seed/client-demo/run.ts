import { and, eq, inArray, notInArray } from "drizzle-orm";

import { db } from "@/drizzle";
import {
  BranchesTable,
  BranchMembershipsTable,
  DressesTable,
  ExpensesTable,
  ImportJobsTable,
  PaymentsTable,
  ReservationsTable,
  SettingsTable,
} from "@/drizzle/schema";
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

type SeedTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function applyBranding(tx: SeedTransaction, manifest: ClientDemoManifest) {
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
 * Folds every demo branch the client does not have into the client's last
 * branch, then deletes it, so the branch switcher lists only the manifest's
 * branches. Moving the rows rather than dropping them keeps the dashboard's
 * totals, and the money invariant, as the `demo` profile built them.
 *
 * Re-seeding stays idempotent: the target is itself a demo branch, so
 * `clearPreviousDemoData` still cascades everything moved here.
 */
async function mergeExtraBranches(
  tx: SeedTransaction,
  manifest: ClientDemoManifest,
) {
  const target = DEMO_BRANCHES[manifest.branches.length - 1].id;

  for (const extra of DEMO_BRANCHES.slice(manifest.branches.length)) {
    await tx
      .update(DressesTable)
      .set({ branchId: target })
      .where(eq(DressesTable.branchId, extra.id));
    await tx
      .update(ReservationsTable)
      .set({ branchId: target })
      .where(eq(ReservationsTable.branchId, extra.id));
    await tx
      .update(PaymentsTable)
      .set({ branchId: target })
      .where(eq(PaymentsTable.branchId, extra.id));
    await tx
      .update(ExpensesTable)
      .set({ branchId: target })
      .where(eq(ExpensesTable.branchId, extra.id));
    await tx
      .update(ImportJobsTable)
      .set({ branchId: target })
      .where(eq(ImportJobsTable.branchId, extra.id));

    // A user already in the target keeps that row, and their extra-branch row
    // goes with the branch. If that row was their current branch, the target
    // becomes current so they are not left without one.
    await tx
      .update(BranchMembershipsTable)
      .set({ isCurrent: true })
      .where(
        and(
          eq(BranchMembershipsTable.branchId, target),
          inArray(
            BranchMembershipsTable.userId,
            tx
              .select({ userId: BranchMembershipsTable.userId })
              .from(BranchMembershipsTable)
              .where(
                and(
                  eq(BranchMembershipsTable.branchId, extra.id),
                  eq(BranchMembershipsTable.isCurrent, true),
                ),
              ),
          ),
        ),
      );

    await tx
      .update(BranchMembershipsTable)
      .set({ branchId: target })
      .where(
        and(
          eq(BranchMembershipsTable.branchId, extra.id),
          notInArray(
            BranchMembershipsTable.userId,
            tx
              .select({ userId: BranchMembershipsTable.userId })
              .from(BranchMembershipsTable)
              .where(eq(BranchMembershipsTable.branchId, target)),
          ),
        ),
      );

    // Cascades the memberships skipped above.
    await tx.delete(BranchesTable).where(eq(BranchesTable.id, extra.id));
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

    await mergeExtraBranches(tx, manifest);

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
