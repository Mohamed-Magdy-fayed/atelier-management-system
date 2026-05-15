import type { MigrationSql } from "./connections";
import { logStep } from "./utils";

/** Truncate atelier domain tables (FK-safe order). Skips missing tables (e.g. products already dropped). */
const TABLES_DESC = [
  "payments",
  "reservations",
  "rental_customers",
  "dresses",
  "settings",
  "branch_memberships",
  "user_credentials",
  "users",
  "branches",
  "products",
] as const;

export async function truncateDomainTables(
  target: MigrationSql,
  dryRun: boolean,
) {
  logStep("fresh", `truncating: ${TABLES_DESC.join(", ")}`);
  if (dryRun) return;

  for (const table of TABLES_DESC) {
    const exists = await target<{ reg: string | null }[]>`
      SELECT to_regclass(${`public.${table}`})::text AS reg
    `;
    if (!exists[0]?.reg) continue;

    await target.unsafe(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE;`);
    logStep("fresh", `truncated ${table}`);
  }
}
