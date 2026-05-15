/**
 * Legacy dress-rental-system → atelier-management-system data migration.
 *
 * Prerequisites:
 * 1. Target DB schema applied: npm run db:migrate
 * 2. LEGACY_DATABASE_URL = read-only legacy Postgres
 * 3. DATABASE_URL = target Postgres
 *
 * Usage:
 *   npm run migrate:legacy              # idempotent full run
 *   npm run migrate:legacy -- --dry-run
 *   npm run migrate:legacy -- --fresh   # truncate domain tables first
 *   npm run migrate:legacy -- --only=users,user_credentials
 */
import "dotenv/config";

import {
  loadMigrationEnv,
  parseCliOptions,
} from "./lib/config";
import { createLegacySql, createTargetSql } from "./lib/connections";
import { truncateDomainTables } from "./lib/fresh";
import {
  clearState,
  ensureStateTable,
  isStepCompleted,
} from "./lib/state";
import { migrationSteps } from "./lib/steps";
import { logStep } from "./lib/utils";
import { verifyMigrationCounts } from "./lib/verify";

async function main() {
  const options = parseCliOptions(process.argv.slice(2));
  const env = loadMigrationEnv();
  const legacy = createLegacySql(env);
  const target = createTargetSql(env);

  console.log("Atelier legacy data migration");
  console.log(`  dryRun: ${options.dryRun}`);
  console.log(`  fresh:  ${options.fresh}`);
  if (options.only) console.log(`  only:   ${options.only.join(", ")}`);

  try {
    await ensureStateTable(target);

    if (options.fresh) {
      await clearState(target, options.dryRun);
      await truncateDomainTables(target, options.dryRun);
    }

    const steps = options.only
      ? migrationSteps.filter((s) => options.only!.includes(s.id))
      : migrationSteps;

    for (const step of steps) {
      if (!options.fresh && (await isStepCompleted(target, step.id))) {
        logStep(step.id, "skip (already completed — use --fresh to re-run all)");
        continue;
      }

      logStep(step.id, `start: ${step.description}`);
      await step.run({ legacy, target, dryRun: options.dryRun });
    }

    if (options.verify && !options.dryRun && !options.only) {
      const ok = await verifyMigrationCounts(legacy, target);
      if (!ok) {
        console.error("Verification reported count mismatches.");
        process.exit(1);
      }
      logStep("verify", "all row counts match");
    }

    console.log("Migration finished successfully.");
  } finally {
    await legacy.end({ timeout: 5 });
    await target.end({ timeout: 5 });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
