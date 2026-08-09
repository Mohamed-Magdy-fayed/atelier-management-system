/**
 * Import pipeline smoke check — drives a real job through
 * createJob → validateBatch loop → startCommit → commitBatch loop for each
 * master-data entity, then removes everything it created.
 *
 * Unlike `smoke:dashboard` this one WRITES, so it refuses to run against
 * anything but localhost unless SMOKE_ALLOW_REMOTE=1 is set. The resolved host
 * is printed before the first statement.
 *
 *   npm run smoke:import
 *
 * Exists because the import path is many small pieces — header aliasing, cell
 * coercion, natural-key matching, the batch cursor — that all typecheck
 * happily while producing wrong rows.
 */
import path from "node:path";

import { config as loadEnv } from "dotenv";

loadEnv({
  path:
    process.env.DOTENV_CONFIG_PATH ?? path.resolve(process.cwd(), ".env.local"),
  override: true,
});

/** Prefix for every record this script creates, so cleanup is unambiguous. */
const MARKER = "ZZSMOKE";

async function main() {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) {
    console.error("DATABASE_URL is not set — nothing to check against.");
    process.exit(1);
  }

  const { hostname, pathname } = new URL(rawUrl);
  console.log(`Target: ${hostname}${pathname}`);

  const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
  if (!isLocal && process.env.SMOKE_ALLOW_REMOTE !== "1") {
    console.error(
      "Refusing to run: this check writes rows and the target is not localhost.",
    );
    process.exit(1);
  }

  const { db, closeDbConnection } = await import("@/drizzle");
  const { and, eq, like } = await import("drizzle-orm");
  const {
    BranchesTable,
    BranchMembershipsTable,
    DressesTable,
    ImportJobsTable,
    RentalCustomersTable,
    UsersTable,
  } = await import("@/drizzle/schema");
  const { mainTranslations } = await import("@/features/core/i18n/global");
  const { createI18n } = await import("@/features/core/i18n/lib");
  const {
    commitImportBatch,
    createImportJob,
    startImportCommit,
    validateImportBatch,
  } = await import("@/features/system/import/server/mutations");
  const { listImportJobRows } = await import(
    "@/features/system/import/server/queries"
  );

  const { t } = createI18n(mainTranslations, "en", "en");

  const admin = await db.query.UsersTable.findFirst({
    where: eq(UsersTable.role, "admin"),
    columns: { id: true, role: true },
  });

  if (!admin) {
    console.error("No admin user in this database — run the seed first.");
    process.exit(1);
  }

  const ctx = {
    db,
    t,
    cookies: { get: () => undefined },
    session: {
      user: { id: admin.id, role: admin.role },
      exp: Date.now() / 1000 + 3600,
    },
  } as never;

  let failures = 0;
  const jobIds: string[] = [];

  function check(label: string, actual: unknown, expected: unknown) {
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    console.log(
      `  ${ok ? "ok  " : "FAIL"} ${label}: ${JSON.stringify(actual)}${ok ? "" : ` (expected ${JSON.stringify(expected)})`}`,
    );
    if (!ok) failures++;
  }

  async function runJob(
    entitySlug: string,
    content: string,
    branchId?: string,
    actorCtx: never = ctx,
  ) {
    const job = await createImportJob(actorCtx, {
      entitySlug: entitySlug as never,
      fileName: `${entitySlug}.csv`,
      content,
      branchId: branchId ?? null,
    });
    jobIds.push(job.id);

    let cursor = 0;
    let validation = { validRows: 0, invalidRows: 0, totalRows: 0 };
    for (;;) {
      const result = await validateImportBatch(actorCtx, {
        jobId: job.id,
        cursor,
      });
      cursor = result.processedRows;
      validation = result;
      if (result.done) break;
    }

    const invalid = await listImportJobRows(actorCtx, {
      jobId: job.id,
      filter: "invalid",
      page: 1,
      perPage: 100,
    });

    for (const row of invalid.rows) {
      console.log(`    row ${row.rowNumber}: ${row.reasons.join(" | ")}`);
    }

    await startImportCommit(actorCtx, { jobId: job.id });

    cursor = 0;
    let committedRows = 0;
    for (;;) {
      const result = await commitImportBatch(actorCtx, {
        jobId: job.id,
        cursor,
      });
      cursor = result.processedRows;
      committedRows = result.committedRows;
      if (result.done) break;
    }

    return {
      jobId: job.id,
      ignoredColumns: job.ignoredColumns ?? [],
      ...validation,
      committedRows,
      invalidReasons: invalid.rows.flatMap((row) => row.reasons),
    };
  }

  try {
    // --- Branches: unknown column ignored, in-file duplicate flagged (both
    // copies), missing required column rejected.
    console.log("\nbranches");
    const branches = await runJob(
      "branches",
      [
        "shortCode,nameEn,nameAr,phone,somethingUnknown",
        `${MARKER}1,Smoke One,دخان ١,0100000001,junk`,
        `${MARKER}2,Smoke Two,دخان ٢,0100000002,junk`,
        `${MARKER}2,Smoke Dup,مكرر,0100000003,junk`,
        ",No Short Code,بدون رمز,0100000004,junk",
      ].join("\n"),
    );
    check("ignored columns", branches.ignoredColumns, ["somethingUnknown"]);
    check("valid rows", branches.validRows, 1);
    check("invalid rows", branches.invalidRows, 3);
    check("committed rows", branches.committedRows, 1);

    const branch = await db.query.BranchesTable.findFirst({
      where: eq(BranchesTable.shortCode, `${MARKER}1`),
      columns: { id: true },
    });
    check("branch created", Boolean(branch), true);

    // --- Customers: three spellings of one number must collapse to one person,
    // matching rental_customer_phone_key().
    console.log("\ncustomers");
    const customers = await runJob(
      "customers",
      [
        "phone,name,note",
        "0100 555 0001,Format A,first",
        "+201005550001,Format B,same person",
        "01005550002,Second Person,",
      ].join("\n"),
    );
    check("valid rows", customers.validRows, 1);
    check("duplicate spellings flagged", customers.invalidRows, 2);

    const smokeCustomers = await db
      .select({ phone: RentalCustomersTable.phone })
      .from(RentalCustomersTable)
      .where(like(RentalCustomersTable.phone, "%555000%"));
    check("one row per person", smokeCustomers.length, 1);

    // --- Dresses: alias headers, bad enum, unknown branch code, blank branch
    // falling back to the job branch, non-numeric money.
    console.log("\ndresses");
    const dresses = await runJob(
      "dresses",
      [
        "dress_code,name,price,deposit,insurance,branch,status",
        `${MARKER}-D1,Alias Gown,1500,500,300,${MARKER}1,available`,
        `${MARKER}-D2,Bad Status,1200,400,200,${MARKER}1,exploded`,
        `${MARKER}-D3,Bad Branch,1200,400,200,NOSUCHBRANCH,available`,
        `${MARKER}-D4,Fallback Branch,1200,400,200,,available`,
        `${MARKER}-D5,Not A Number,twelve,400,200,${MARKER}1,available`,
      ].join("\n"),
      branch?.id,
    );
    check("alias headers accepted", dresses.ignoredColumns, []);
    check("valid rows", dresses.validRows, 2);
    check("invalid rows", dresses.invalidRows, 3);
    check("committed rows", dresses.committedRows, 2);

    const created = await db
      .select({ code: DressesTable.code, branchId: DressesTable.branchId })
      .from(DressesTable)
      .where(like(DressesTable.code, `${MARKER}%`));
    check("dresses created", created.length, 2);
    check(
      "blank branch fell back to the job branch",
      created.every((dress) => dress.branchId === branch?.id),
      true,
    );

    // --- Re-running the same dresses file must update, never duplicate.
    console.log("\ndresses (re-run)");
    const rerun = await runJob(
      "dresses",
      [
        "dress_code,name,price,deposit,insurance,branch,status",
        `${MARKER}-D1,Alias Gown Renamed,1600,500,300,${MARKER}1,available`,
      ].join("\n"),
      branch?.id,
    );
    check("re-run committed", rerun.committedRows, 1);

    const afterRerun = await db
      .select({ code: DressesTable.code, price: DressesTable.pricePerDay })
      .from(DressesTable)
      .where(eq(DressesTable.code, `${MARKER}-D1`));
    check("no duplicate created", afterRerun.length, 1);
    check("price updated", afterRerun[0]?.price, 1600);

    // --- A stale cursor must be rejected rather than applied twice.
    console.log("\ncursor guard");
    let rejected = false;
    try {
      await validateImportBatch(ctx, { jobId: rerun.jobId, cursor: 0 });
    } catch {
      rejected = true;
    }
    check("stale batch rejected", rejected, true);

    // --- Import must not be a weaker door than the normal mutation path.
    // The actor here is an employee whose only membership is branch B, so
    // everything touching branch ${MARKER}1 has to be refused.
    console.log("\nauthorization");

    const [branchB] = await db
      .insert(BranchesTable)
      .values({
        shortCode: `${MARKER}B`,
        nameEn: "Smoke Other",
        nameAr: "دخان آخر",
      })
      .returning({ id: BranchesTable.id });

    const [employee] = await db
      .insert(UsersTable)
      .values({
        email: `${MARKER}.employee@smoke.local`,
        name: "Smoke Employee",
        role: "employee",
        createdBy: admin.id,
      })
      .returning({ id: UsersTable.id, role: UsersTable.role });

    await db
      .insert(BranchMembershipsTable)
      .values({ userId: employee.id, branchId: branchB.id });

    const employeeCtx = {
      db,
      t,
      cookies: { get: () => undefined },
      session: {
        user: { id: employee.id, role: employee.role },
        exp: Date.now() / 1000 + 3600,
      },
    } as never;

    // Branch CRUD is admin-only, so the branches spec must refuse outright.
    let branchesRefused = false;
    try {
      await createImportJob(employeeCtx, {
        entitySlug: "branches" as never,
        fileName: "branches.csv",
        content: `shortCode,nameEn,nameAr\n${MARKER}X,Sneaky,متسلل`,
        branchId: null,
      });
    } catch {
      branchesRefused = true;
    }
    check("employee refused branches import", branchesRefused, true);
    check(
      "no branch created by employee",
      (
        await db
          .select({ id: BranchesTable.id })
          .from(BranchesTable)
          .where(eq(BranchesTable.shortCode, `${MARKER}X`))
      ).length,
      0,
    );

    // Naming an unreachable branch in the file must fail the row, not write it.
    const crossBranchCreate = await runJob(
      "dresses",
      [
        "code,title,pricePerDay,depositAmount,insurance,branchShortCode",
        `${MARKER}-D9,Cross Branch,900,300,100,${MARKER}1`,
      ].join("\n"),
      branchB.id,
      employeeCtx,
    );
    check("cross-branch create rejected", crossBranchCreate.committedRows, 0);
    check(
      "reason names branch access",
      crossBranchCreate.invalidReasons.some((reason) =>
        reason.includes("do not have access to the branch"),
      ),
      true,
    );

    // Matching an existing dress by code reaches across branches, so a dress
    // living in an unreachable branch must not become an update target.
    const crossBranchUpdate = await runJob(
      "dresses",
      [
        "code,title,pricePerDay,depositAmount,insurance,branchShortCode",
        `${MARKER}-D1,Hijacked,1,1,1,${MARKER}B`,
      ].join("\n"),
      branchB.id,
      employeeCtx,
    );
    check("cross-branch update rejected", crossBranchUpdate.committedRows, 0);

    const untouched = await db
      .select({ price: DressesTable.pricePerDay })
      .from(DressesTable)
      .where(eq(DressesTable.code, `${MARKER}-D1`));
    check("other branch's dress untouched", untouched[0]?.price, 1600);
  } finally {
    console.log("\ncleanup");
    const { eq: eqOp, like: likeOp, inArray } = await import("drizzle-orm");

    await db
      .delete(DressesTable)
      .where(likeOp(DressesTable.code, `${MARKER}%`));
    await db
      .delete(RentalCustomersTable)
      .where(likeOp(RentalCustomersTable.phone, "%555000%"));
    // Memberships first: the smoke employee references the smoke branch.
    await db
      .delete(UsersTable)
      .where(likeOp(UsersTable.email, `${MARKER}%@smoke.local`));
    await db
      .delete(BranchesTable)
      .where(likeOp(BranchesTable.shortCode, `${MARKER}%`));
    if (jobIds.length > 0) {
      await db
        .delete(ImportJobsTable)
        .where(inArray(ImportJobsTable.id, jobIds));
    }
    void eqOp;
    void and;
    console.log("  removed smoke rows and jobs");
    await closeDbConnection();
  }

  if (failures > 0) {
    console.error(`\n${failures} check(s) failed.`);
    process.exit(1);
  }
  console.log("\nAll import checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
