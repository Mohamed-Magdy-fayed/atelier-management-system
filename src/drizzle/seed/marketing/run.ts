import { existsSync } from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";

import { closeDbConnection, db } from "@/drizzle";
import {
  BranchesTable,
  BranchMembershipsTable,
  DressesTable,
  ExpensesTable,
  PaymentsTable,
  RentalCustomersTable,
  ReservationsTable,
  SettingsTable,
  UsersTable,
} from "@/drizzle/schema";
import { SYSTEM_SETTING_CODE } from "@/features/system/settings/lib/system-settings-registry";

import { clearDb } from "../clear-db";
import { SEED_ADMIN_ID, SEED_SYSTEM_ACTOR } from "../constants";
import { seedAdminProfile } from "../profiles/admin";
import { seedSettingsProfile } from "../profiles/settings";
import { buildLamsaDataset } from "./build";
import {
  LAMSA_ADMIN_NAME,
  LAMSA_BRAND,
  LAMSA_DRESSES,
  lamsaDressImagePath,
} from "./fixtures";

const EXPECTED_PORT = "5433";
const EXPECTED_DATABASE = "atelier_marketing";
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

/**
 * This seed TRUNCATEs every table before writing, so it refuses any database
 * but the dedicated marketing one — on top of `clearDb`'s own local-host rule.
 * `.env` and `.env.local` in this repo point at production; matching the port
 * and database name as well as the host means a stray local database is not
 * enough to pass either.
 */
function assertMarketingDatabase(): void {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL is not set.");
  const url = new URL(raw);
  const database = url.pathname.replace(/^\//, "");
  if (
    !LOCAL_HOSTS.has(url.hostname) ||
    url.port !== EXPECTED_PORT ||
    database !== EXPECTED_DATABASE
  ) {
    throw new Error(
      `Refusing to seed ${url.hostname}:${url.port}/${database}: the marketing seed only writes to localhost:${EXPECTED_PORT}/${EXPECTED_DATABASE}.`,
    );
  }
  if (!process.env.SEED_ADMIN_PASSWORD) {
    throw new Error(
      "SEED_ADMIN_PASSWORD is required (see .env.marketing.local).",
    );
  }
}

/** The dresses' photos are local files; a missing one renders as a broken image. */
function assertPhotosPresent(): void {
  const missing = LAMSA_DRESSES.map((dress) =>
    lamsaDressImagePath(dress.rank),
  ).filter(
    (imagePath) => !existsSync(path.join(process.cwd(), "public", imagePath)),
  );
  if (missing.length > 0) {
    throw new Error(
      `Missing dress photos (run \`npm run marketing:photos\`):\n  ${missing.join("\n  ")}`,
    );
  }
}

async function applyBranding() {
  const values: Array<[string, string]> = [
    [SYSTEM_SETTING_CODE.BRAND_NAME_EN, LAMSA_BRAND.nameEn],
    [SYSTEM_SETTING_CODE.BRAND_NAME_AR, LAMSA_BRAND.nameAr],
  ];
  for (const [code, value] of values) {
    await db
      .update(SettingsTable)
      .set({ value, updatedBy: SEED_SYSTEM_ACTOR })
      .where(eq(SettingsTable.code, code));
  }
  await db
    .update(UsersTable)
    .set({ name: LAMSA_ADMIN_NAME })
    .where(eq(UsersTable.id, SEED_ADMIN_ID));
}

/**
 * Rebuilds «أتيليه لمسة» from scratch on the marketing database: empties it,
 * restores settings and the admin login, then writes the atelier. Safe to run
 * any number of times; each run rolls the dates forward to today.
 */
export async function seedLamsaDataset() {
  assertMarketingDatabase();
  assertPhotosPresent();

  await clearDb();
  await seedSettingsProfile();
  await seedAdminProfile();

  const dataset = buildLamsaDataset(new Date());

  await db.transaction(async (tx) => {
    await tx.insert(BranchesTable).values(dataset.branch);
    await tx.insert(UsersTable).values(dataset.employees);
    await tx.insert(BranchMembershipsTable).values(dataset.memberships);
    await tx.insert(DressesTable).values(dataset.dresses);
    await tx.insert(RentalCustomersTable).values(dataset.customers);
    await tx.insert(ReservationsTable).values(dataset.reservations);
    await tx.insert(PaymentsTable).values(dataset.payments);
    await tx.insert(ExpensesTable).values(dataset.expenses);
  });

  await applyBranding();

  const upcoming = dataset.reservations.filter(
    (reservation) =>
      reservation.status === "reserved" &&
      reservation.occasionDate.getTime() > Date.now(),
  ).length;

  console.info(
    "\n«أتيليه لمسة» written to %s:",
    new URL(process.env.DATABASE_URL ?? "").host,
  );
  for (const [table, rows] of Object.entries({
    dresses: dataset.dresses.length,
    rental_customers: dataset.customers.length,
    reservations: dataset.reservations.length,
    "  of which upcoming": upcoming,
    payments: dataset.payments.length,
    expenses: dataset.expenses.length,
  })) {
    console.info("  %s %s", table.padEnd(20), rows);
  }
}

seedLamsaDataset()
  .then(() => closeDbConnection())
  .catch(async (error: unknown) => {
    console.error("❌", error instanceof Error ? error.message : error);
    await closeDbConnection();
    process.exit(1);
  });
