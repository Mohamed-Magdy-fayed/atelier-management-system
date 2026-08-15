/**
 * Repair for the legacy-migration timestamp shift.
 *
 * The `migrate:legacy` run read legacy `timestamp WITHOUT time zone` columns
 * through postgres.js, which turns them into JS `Date` using the **Node process
 * timezone**. Run from a machine on `Africa/Cairo`, a legacy wall-clock of
 * `2026-08-15 21:00` became the instant `18:00Z` instead of `21:00Z` — every
 * migrated timestamp landed 2–3 hours early (2h in winter, 3h in summer).
 *
 * Date+time columns only look mildly wrong, but `occasionDate` is anchored to a
 * day boundary, so the shift pushes it onto the **previous day** in the grid and
 * drops the row out of any "occasion date = X" filter.
 *
 * This script does not apply a relative shift — the offset is 2h for half the
 * year and 3h for the other half, so a constant correction would corrupt every
 * winter booking. It re-reads each legacy value as **text** (bypassing the
 * driver's Date conversion entirely) and re-writes it with an explicit `+00`
 * offset. That is exact, DST-proof, and idempotent — running it twice produces
 * the same result.
 *
 * Only rows that exist in the legacy DB are touched, so reservations created
 * natively in the new system after the migration are left alone.
 *
 * Usage:
 *   npm run fix:tz-shift              # dry run — reads only, writes nothing
 *   npm run fix:tz-shift -- --apply   # write the corrected values
 *   npm run fix:tz-shift -- --table=reservations
 */
import "dotenv/config";

import { loadMigrationEnv } from "./lib/config";
import type { MigrationSql } from "./lib/connections";
import { createLegacySql, createTargetSql } from "./lib/connections";

/** Legacy table → target table, plus any renamed columns. */
const TABLE_MAP: {
  legacyTable: string;
  targetTable: string;
  columnRenames: Record<string, string>;
}[] = [
  {
    legacyTable: "reservations",
    targetTable: "reservations",
    // The legacy spelling of the column carried a typo.
    columnRenames: { recievingDateTime: "receivingDateTime" },
  },
  { legacyTable: "payments", targetTable: "payments", columnRenames: {} },
  { legacyTable: "dresses", targetTable: "dresses", columnRenames: {} },
];

const SAMPLE_ROWS = 5;

/** `user@host/database` — enough to identify the endpoint, no credentials. */
function describeTarget(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.username}@${parsed.host}${parsed.pathname}`;
  } catch {
    return "<unparseable connection string>";
  }
}

type Options = { apply: boolean; only: string[] | null; limit: number | null };

function parseOptions(argv: string[]): Options {
  const args = argv.filter((a) => a !== "--");
  const onlyArg = args.find((a) => a.startsWith("--table="));
  const limitArg = args.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? Number(limitArg.slice("--limit=".length)) : null;
  return {
    apply: args.includes("--apply"),
    only: onlyArg ? onlyArg.slice("--table=".length).split(",") : null,
    limit: limit != null && Number.isFinite(limit) && limit > 0 ? limit : null,
  };
}

async function naiveTimestampColumns(
  sql: MigrationSql,
  table: string,
): Promise<string[]> {
  const rows = await sql<{ column_name: string }[]>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = ${table}
      AND data_type = 'timestamp without time zone'
    ORDER BY ordinal_position
  `;
  return rows.map((r) => r.column_name);
}

async function targetColumns(
  sql: MigrationSql,
  table: string,
): Promise<Set<string>> {
  const rows = await sql<{ column_name: string }[]>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = ${table}
  `;
  return new Set(rows.map((r) => r.column_name));
}

async function repairTable(
  legacy: MigrationSql,
  target: MigrationSql,
  entry: (typeof TABLE_MAP)[number],
  apply: boolean,
  limit: number | null,
): Promise<void> {
  const { legacyTable, targetTable, columnRenames } = entry;

  const legacyCols = await naiveTimestampColumns(legacy, legacyTable);
  if (legacyCols.length === 0) {
    console.log(
      `\n[${legacyTable}] no naive timestamp columns in legacy — nothing to repair`,
    );
    return;
  }

  const available = await targetColumns(target, targetTable);
  const pairs = legacyCols
    .map((legacyCol) => ({
      legacyCol,
      targetCol: columnRenames[legacyCol] ?? legacyCol,
    }))
    .filter((p) => available.has(p.targetCol));

  if (pairs.length === 0) {
    console.log(`\n[${legacyTable}] no matching target columns — skipped`);
    return;
  }

  console.log(`\n=== ${legacyTable} → ${targetTable}`);
  console.log(`    columns: ${pairs.map((p) => p.targetCol).join(", ")}`);

  // Read the legacy values as TEXT so the driver never builds a Date from them.
  const selectList = pairs
    .map((p) => `"${p.legacyCol}"::text AS "${p.targetCol}"`)
    .join(", ");
  const legacyRows = await legacy.unsafe<Record<string, string | null>[]>(
    `SELECT id::text AS id, ${selectList} FROM "${legacyTable}"`,
  );

  console.log(`    legacy rows: ${legacyRows.length}`);

  let changed = 0;
  let missing = 0;
  let applied = 0;
  const samples: string[] = [];

  for (const row of legacyRows) {
    const id = row.id;
    if (!id) continue;

    // What the target holds right now, rendered as a UTC wall clock so it is
    // directly comparable to the legacy text.
    const currentList = pairs
      .map(
        (p) =>
          `("${p.targetCol}" AT TIME ZONE 'UTC')::text AS "${p.targetCol}"`,
      )
      .join(", ");
    const [current] = await target.unsafe<Record<string, string | null>[]>(
      `SELECT ${currentList} FROM "${targetTable}" WHERE id = $1::uuid`,
      [id],
    );

    if (!current) {
      missing += 1;
      continue;
    }

    const drifted = pairs.filter((p) => {
      const want = row[p.targetCol];
      const have = current[p.targetCol];
      if (want == null && have == null) return false;
      if (want == null || have == null) return true;
      return new Date(`${want}Z`).getTime() !== new Date(`${have}Z`).getTime();
    });

    if (drifted.length === 0) continue;
    changed += 1;

    if (samples.length < SAMPLE_ROWS) {
      const detail = drifted
        .map((p) => {
          const have = current[p.targetCol];
          const want = row[p.targetCol];
          const cairo = want
            ? new Date(`${want}Z`).toLocaleString("en-GB", {
                timeZone: "Africa/Cairo",
              })
            : "null";
          return `        ${p.targetCol}: now=${have}Z  ->  fixed=${want}Z  (Cairo: ${cairo})`;
        })
        .join("\n");
      samples.push(`      id=${id}\n${detail}`);
    }

    if (!apply) continue;

    // Concatenating the offset and casting straight to `timestamptz` keeps the
    // session timezone out of it entirely. `$n::timestamp AT TIME ZONE 'UTC'`
    // looks equivalent but is not: the driver types the parameter before the
    // cast is applied, so the value gets read as session-local (Africa/Cairo)
    // and silently lands 2-3 hours off — the exact bug being repaired here.
    const setList = pairs
      .map((p, i) => `"${p.targetCol}" = ($${i + 2} || '+00')::timestamptz`)
      .join(", ");
    const verifyList = pairs
      .map(
        (p) =>
          `("${p.targetCol}" AT TIME ZONE 'UTC')::text AS "${p.targetCol}"`,
      )
      .join(", ");

    // RETURNING the written values turns a silently-ineffective UPDATE into a
    // hard failure instead of a "success" that changed nothing.
    const written = await target.unsafe<Record<string, string | null>[]>(
      `UPDATE "${targetTable}" SET ${setList} WHERE id = $1::uuid RETURNING ${verifyList}`,
      [id, ...pairs.map((p) => row[p.targetCol])],
    );

    const echoed = written[0];
    if (!echoed) {
      throw new Error(
        `UPDATE ${targetTable} id=${id} matched no row — aborting before further writes.`,
      );
    }
    const stillWrong = pairs.filter(
      (p) => (echoed[p.targetCol] ?? null) !== (row[p.targetCol] ?? null),
    );
    if (stillWrong.length > 0) {
      const detail = stillWrong
        .map(
          (p) =>
            `${p.targetCol}: wrote=${row[p.targetCol]} but row now reads ${echoed[p.targetCol]}`,
        )
        .join("; ");
      throw new Error(
        `UPDATE ${targetTable} id=${id} did not take effect — ${detail}`,
      );
    }
    applied += 1;

    if (limit != null && applied >= limit) {
      console.log(`    stopping early: --limit=${limit} reached`);
      break;
    }
  }

  if (samples.length) {
    console.log("    sample corrections:");
    console.log(samples.join("\n"));
  }
  console.log(
    `    rows needing correction: ${changed}${
      missing ? ` (not present in target: ${missing})` : ""
    }`,
  );
  console.log(
    `    ${apply ? `APPLIED — rows written and verified: ${applied}` : "dry run — no writes"}`,
  );
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const env = loadMigrationEnv();
  const legacy = createLegacySql(env);
  const target = createTargetSql(env);

  console.log("Legacy timestamp-shift repair");
  console.log(
    `  mode: ${options.apply ? "APPLY (writes)" : "dry run (read-only)"}`,
  );
  console.log(
    `  node timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`,
  );
  // This script is pointed at a different database depending on which
  // environment is being repaired, so print the resolved endpoints (never the
  // credentials) before touching anything.
  console.log(
    `  source (read-only): ${describeTarget(env.LEGACY_DATABASE_URL)}`,
  );
  console.log(`  target (written):   ${describeTarget(env.DATABASE_URL)}`);
  if (options.only) console.log(`  tables: ${options.only.join(", ")}`);

  try {
    const entries = options.only
      ? TABLE_MAP.filter((e) => options.only?.includes(e.legacyTable))
      : TABLE_MAP;

    for (const entry of entries) {
      await repairTable(legacy, target, entry, options.apply, options.limit);
    }

    if (!options.apply) {
      console.log(
        "\nNothing was written. Re-run with `-- --apply` once the sample corrections look right.",
      );
    }
  } finally {
    await legacy.end({ timeout: 5 });
    await target.end({ timeout: 5 });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
