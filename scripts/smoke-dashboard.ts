/**
 * Dashboard smoke check — executes every query `getDashboardData` issues and
 * asserts the invariants the figures must satisfy.
 *
 * Read-only: SELECTs only, no writes. Exists because a broken SQL binding is
 * invisible to `typecheck` and `build` — both passed while the production
 * dashboard failed on a parameter Postgres could not type. Run it after
 * touching dashboard queries.
 *
 *   npm run smoke:dashboard
 *
 * Loads `.env.local` by default so it cannot reach a remote database by
 * accident; override with DOTENV_CONFIG_PATH. The resolved host is printed
 * before any query runs.
 */
import path from "node:path";

import { config as loadEnv } from "dotenv";

loadEnv({
  path:
    process.env.DOTENV_CONFIG_PATH ?? path.resolve(process.cwd(), ".env.local"),
  override: true,
});

async function main() {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) {
    console.error("DATABASE_URL is not set — nothing to check against.");
    process.exit(1);
  }
  const { hostname, pathname } = new URL(rawUrl);
  console.log(`Target: ${hostname}${pathname}`);

  const { db, closeDbConnection } = await import("@/drizzle");
  const { BranchesTable } = await import("@/drizzle/schema");
  const { getDashboardData } = await import(
    "@/features/system/dashboard/server/queries"
  );

  const branches = await db
    .select({ id: BranchesTable.id, name: BranchesTable.nameEn })
    .from(BranchesTable);

  // getDashboardData only reaches for db and session; `t` is used on error paths.
  const ctx = {
    db,
    session: { user: { id: "smoke-dashboard", role: "admin" } },
    t: (key: string) => key,
  } as unknown as Parameters<typeof getDashboardData>[0];

  const scopes = [
    { label: "all branches", branchId: undefined as string | undefined },
    ...branches.map((b) => ({ label: b.name, branchId: b.id })),
  ];

  const failures: string[] = [];

  for (const scope of scopes) {
    try {
      const data = await getDashboardData(ctx, { branchId: scope.branchId });
      const s = data.summary;

      const buckets =
        s.dressesOut +
        s.dressesAvailable +
        s.dressesAtTailor +
        s.dressesAtDryCleaner +
        s.dressesUnderRepair;
      if (buckets !== s.activeDresses) {
        failures.push(
          `${scope.label}: dress buckets sum to ${buckets}, expected ${s.activeDresses}`,
        );
      }

      const methodSum = data.rangeStats.paymentsByMethod.reduce(
        (total, row) => total + row.amount,
        0,
      );
      if (methodSum !== data.rangeStats.totalRevenue) {
        failures.push(
          `${scope.label}: payment methods sum to ${methodSum}, revenue is ${data.rangeStats.totalRevenue}`,
        );
      }

      if (data.overdueOutstanding > data.totalOutstanding) {
        failures.push(
          `${scope.label}: overdue ${data.overdueOutstanding} exceeds total outstanding ${data.totalOutstanding}`,
        );
      }

      console.log(
        `  ok  ${scope.label} — dresses ${s.dressesOut}/${s.activeDresses} out, revenue ${data.rangeStats.totalRevenue}, outstanding ${data.totalOutstanding}, new customers ${data.rangeStats.newCustomers}`,
      );
    } catch (error) {
      const err = error as { cause?: unknown; message?: string };
      failures.push(`${scope.label}: ${String(err.cause ?? err.message)}`);
    }
  }

  // An explicit range takes a different path through parseDashboardRange than
  // the default window, and drives the previous-period comparisons.
  try {
    const to = new Date();
    const from = new Date(to.getTime() - 29 * 86_400_000);
    await getDashboardData(ctx, {
      from: from.toISOString(),
      to: to.toISOString(),
    });
    console.log("  ok  explicit date range");
  } catch (error) {
    const err = error as { cause?: unknown; message?: string };
    failures.push(`explicit range: ${String(err.cause ?? err.message)}`);
  }

  await closeDbConnection();

  if (failures.length > 0) {
    console.error(`\n${failures.length} failure(s):`);
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exit(1);
  }
  console.log("\nAll dashboard queries executed and invariants held.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
