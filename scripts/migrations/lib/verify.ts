import type { MigrationSql } from "./connections";
import { countLegacy, countTarget, logStep } from "./utils";

const PAIRS: { step: string; legacyTable: string; targetTable: string }[] = [
  { step: "branches", legacyTable: "branches", targetTable: "branches" },
  { step: "users", legacyTable: "users", targetTable: "users" },
  {
    step: "user_credentials",
    legacyTable: "users",
    targetTable: "user_credentials",
  },
  {
    step: "rental_customers",
    legacyTable: "customers",
    targetTable: "rental_customers",
  },
  { step: "dresses", legacyTable: "dresses", targetTable: "dresses" },
  {
    step: "reservations",
    legacyTable: "reservations",
    targetTable: "reservations",
  },
  { step: "payments", legacyTable: "payments", targetTable: "payments" },
  { step: "settings", legacyTable: "settings", targetTable: "settings" },
];

export async function verifyMigrationCounts(
  legacy: MigrationSql,
  target: MigrationSql,
): Promise<boolean> {
  let ok = true;

  for (const { step, legacyTable, targetTable } of PAIRS) {
    let legacyCount = await countLegacy(legacy, legacyTable);
    if (step === "user_credentials") {
      const rows = await legacy<{ count: number }[]>`
        SELECT COUNT(*)::int AS count FROM users
        WHERE password IS NOT NULL AND salt IS NOT NULL
          AND LENGTH(TRIM(password)) > 0 AND LENGTH(TRIM(salt)) > 0
      `;
      legacyCount = Number(rows[0]?.count ?? 0);
    }

    const targetCount = await countTarget(target, targetTable);
    const match = legacyCount === targetCount;
    if (!match) ok = false;

    logStep(
      "verify",
      `${step}: legacy=${legacyCount} target=${targetCount} ${match ? "OK" : "MISMATCH"}`,
    );
  }

  const membershipLegacy = await legacy<{ count: number }[]>`
    SELECT COUNT(*)::int AS count FROM users WHERE "branchId" IS NOT NULL
  `;
  const membershipTarget = await countTarget(target, "branch_memberships");
  const mLegacy = Number(membershipLegacy[0]?.count ?? 0);
  const mMatch = mLegacy === membershipTarget;
  if (!mMatch) ok = false;
  logStep(
    "verify",
    `branch_memberships: legacy=${mLegacy} target=${membershipTarget} ${mMatch ? "OK" : "MISMATCH"}`,
  );

  return ok;
}
