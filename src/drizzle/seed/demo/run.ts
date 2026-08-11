import { inArray } from "drizzle-orm";

import { db } from "@/drizzle";
import {
  BranchesTable,
  BranchMembershipsTable,
  DressesTable,
  ExpensesTable,
  PaymentsTable,
  RentalCustomersTable,
  ReservationsTable,
  UsersTable,
} from "@/drizzle/schema";

import { assertSafeToDestroyData, getDatabaseHostname } from "../clear-db";
import { seedAdminProfile } from "../profiles/admin";
import { seedSettingsProfile } from "../profiles/settings";
import { buildDemoDataset } from "./build";
import { DEMO_BRANCHES, DEMO_EMPLOYEES } from "./fixtures";
import { demoId } from "./ids";

type DemoTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Postgres caps a statement at 65 535 bound parameters, and a year of trading
 * is several thousand rows wide. Chunking keeps every insert well inside that
 * ceiling regardless of how large the profile grows.
 */
const INSERT_CHUNK = 500;

function chunk<T>(rows: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < rows.length; index += size) {
    chunks.push(rows.slice(index, index + size));
  }
  return chunks;
}

/**
 * Headroom on the customer sweep.
 *
 * Customer ids are derived from an ordinal, and the number of customers a run
 * produces depends on how the repeat distribution falls. Deleting past the
 * current run's count means a previous, larger run leaves nothing behind.
 * Deleting an id that was never inserted is a no-op.
 */
const CUSTOMER_SWEEP_HEADROOM = 1_000;

/**
 * Removes whatever a previous demo run wrote, and nothing else.
 *
 * Scoped by the profile's deterministic ids rather than by truncating tables:
 * `npm run seed demo` must be safe to run against a database that also holds
 * imported or hand-made records, and `clear-db.ts` stays the only thing that
 * empties tables wholesale.
 *
 * Deleting the branches cascades reservations, payments, expenses, dresses and
 * branch memberships with them (every one of those FKs is ON DELETE CASCADE),
 * which is also why the customers can go straight afterwards — nothing still
 * references them by then.
 */
async function clearPreviousDemoData(tx: DemoTx, customerCount: number) {
  const branchIds = DEMO_BRANCHES.map((branch) => branch.id);
  const employeeIds = DEMO_EMPLOYEES.map((employee) => employee.id);
  const customerIds = Array.from(
    { length: customerCount + CUSTOMER_SWEEP_HEADROOM },
    (_, index) => demoId("customer", index + 1),
  );

  await tx.delete(BranchesTable).where(inArray(BranchesTable.id, branchIds));

  for (const batch of chunk(customerIds, INSERT_CHUNK)) {
    await tx
      .delete(RentalCustomersTable)
      .where(inArray(RentalCustomersTable.id, batch));
  }

  await tx.delete(UsersTable).where(inArray(UsersTable.id, employeeIds));
}

export type DemoSeedSummary = Record<string, number>;

function printSummary(summary: DemoSeedSummary) {
  console.info("\nDemo dataset written to %s:", getDatabaseHostname());
  for (const [table, rows] of Object.entries(summary)) {
    console.info("  %s %s", `${table}`.padEnd(18), rows);
  }
}

/**
 * Seeds the demo atelier: three branches of deliberately different sizes, their
 * staff, portfolios and a full year of trading — the reservation, payment and
 * expense history that makes every dashboard panel non-empty on every branch.
 *
 * Idempotent — a previous run's rows are removed first, and every id is derived
 * from the fixture it belongs to, so running it twice produces the same
 * database rather than a doubled one.
 */
export async function seedDemoDataset() {
  // Scoped deletes are still deletes: the same host rules that protect
  // `clear-db` protect this.
  assertSafeToDestroyData("replace the demo dataset");

  await seedSettingsProfile();
  await seedAdminProfile();

  // One instant for the whole run. Every stored timestamp is an offset from
  // this, so a re-run on the same day reproduces the dataset exactly.
  const now = new Date();
  const dataset = buildDemoDataset(now);

  await db.transaction(async (tx) => {
    await clearPreviousDemoData(tx, dataset.customers.length);

    await tx.insert(BranchesTable).values(dataset.branches);
    await tx.insert(UsersTable).values(dataset.employees);
    await tx.insert(BranchMembershipsTable).values(dataset.memberships);

    for (const batch of chunk(dataset.dresses, INSERT_CHUNK)) {
      await tx.insert(DressesTable).values(batch);
    }
    for (const batch of chunk(dataset.customers, INSERT_CHUNK)) {
      await tx.insert(RentalCustomersTable).values(batch);
    }
    for (const batch of chunk(dataset.reservations, INSERT_CHUNK)) {
      await tx.insert(ReservationsTable).values(batch);
    }
    for (const batch of chunk(dataset.payments, INSERT_CHUNK)) {
      await tx.insert(PaymentsTable).values(batch);
    }
    for (const batch of chunk(dataset.expenses, INSERT_CHUNK)) {
      await tx.insert(ExpensesTable).values(batch);
    }
  });

  printSummary({
    branches: dataset.branches.length,
    employees: dataset.employees.length,
    branch_memberships: dataset.memberships.length,
    dresses: dataset.dresses.length,
    rental_customers: dataset.customers.length,
    reservations: dataset.reservations.length,
    payments: dataset.payments.length,
    expenses: dataset.expenses.length,
  });

  return {
    seededCustomerCount: dataset.customers.length,
    seededEmployees: dataset.employees.map((employee) => ({
      id: String(employee.id),
    })),
  };
}
