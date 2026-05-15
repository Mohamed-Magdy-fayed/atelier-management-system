import type { MigrationSql } from "./connections";

const STATE_TABLE = "_legacy_migration_state";

export async function ensureStateTable(target: MigrationSql) {
  await target.unsafe(`
    CREATE TABLE IF NOT EXISTS "${STATE_TABLE}" (
      step text PRIMARY KEY,
      completed_at timestamptz NOT NULL DEFAULT now(),
      legacy_count integer,
      target_count integer,
      notes text
    );
  `);
}

export async function isStepCompleted(
  target: MigrationSql,
  step: string,
): Promise<boolean> {
  const rows = await target.unsafe<{ step: string }[]>(`
    SELECT step FROM "${STATE_TABLE}" WHERE step = '${step.replace(/'/g, "''")}' LIMIT 1
  `);
  return rows.length > 0;
}

export async function markStepCompleted(
  target: MigrationSql,
  step: string,
  meta: { legacyCount: number; targetCount: number; notes?: string },
  dryRun: boolean,
) {
  if (dryRun) return;

  const notes = meta.notes?.replace(/'/g, "''") ?? "";
  await target.unsafe(`
    INSERT INTO "${STATE_TABLE}" (step, legacy_count, target_count, notes)
    VALUES ('${step.replace(/'/g, "''")}', ${meta.legacyCount}, ${meta.targetCount}, ${notes ? `'${notes}'` : "NULL"})
    ON CONFLICT (step) DO UPDATE SET
      completed_at = now(),
      legacy_count = EXCLUDED.legacy_count,
      target_count = EXCLUDED.target_count,
      notes = EXCLUDED.notes
  `);
}

export async function clearState(target: MigrationSql, dryRun: boolean) {
  if (dryRun) return;
  await target.unsafe(`TRUNCATE TABLE "${STATE_TABLE}";`);
}
