import { TRPCError } from "@trpc/server";
import { and, eq, lt } from "drizzle-orm";

import { ImportJobRowsTable, ImportJobsTable } from "@/drizzle/schema";
import { LOCALE_COOKIE_NAME } from "@/features/core/i18n/lib";
import {
  assertOperationalStaff,
  assertUserCanAccessBranch,
} from "@/features/system/shared/staff-access";

import { parseImportCsv, toKeyedRow } from "../lib/csv";
import type { ImportEntitySpec } from "../specs";
import { getImportSpec, MAX_IMPORT_ROWS, matchImportHeaders } from "../specs";
import type { ImportReason, ResolvedRow } from "./handlers";
import { getImportHandler } from "./handlers";
import type { CreateImportJobInput, ImportBatchInput } from "./schemas";
import { getRequiredSession, type TRPCContext } from "./shared";

/** Jobs are kept for audit and re-runs, then aged out. */
const JOB_RETENTION_DAYS = 30;

/**
 * Reason keys are spec data, so they cannot be narrowed to the generated key
 * union at compile time. The catalogue is exercised by the import tests and a
 * missing key surfaces as the raw key rather than a crash.
 */
function translateReasons(ctx: TRPCContext, reasons: ImportReason[]) {
  const translate = ctx.t as unknown as (
    key: string,
    params?: Record<string, unknown>,
  ) => string;

  return reasons.map((reason) => translate(reason.reasonKey, reason.params));
}

async function loadJobForActor(ctx: TRPCContext, jobId: string) {
  const session = getRequiredSession(ctx);
  assertOperationalStaff(session.user.role);

  const job = await ctx.db.query.ImportJobsTable.findFirst({
    where: eq(ImportJobsTable.id, jobId),
  });

  if (!job) {
    throw new TRPCError({ code: "NOT_FOUND" });
  }

  // An import writes across the tenant, so only its creator (or an admin) may
  // drive it forward.
  if (job.createdBy !== session.user.id && session.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }

  return { job, session };
}

export async function createImportJob(
  ctx: TRPCContext,
  input: CreateImportJobInput,
) {
  const session = getRequiredSession(ctx);
  assertOperationalStaff(session.user.role);

  const spec = getImportSpec(input.entitySlug);

  if (!spec || !getImportHandler(input.entitySlug)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: ctx.t("systemPages.importUnsupportedEntity"),
    });
  }

  if (input.branchId) {
    await assertUserCanAccessBranch(ctx, session, input.branchId);
  }

  const parsed = parseImportCsv(input.content);

  if (!parsed) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: ctx.t("systemPages.importFileUnreadable"),
    });
  }

  if (parsed.rows.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: ctx.t("systemPages.importFileEmpty"),
    });
  }

  if (parsed.rows.length > MAX_IMPORT_ROWS) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: ctx.t("systemPages.importTooManyRows", {
        max: String(MAX_IMPORT_ROWS),
      }),
    });
  }

  const { ignoredColumns, missingRequired } = matchImportHeaders(
    spec,
    parsed.headers,
  );

  // Fail before creating a job: a file missing a required column cannot produce
  // a single valid row, so walking it row by row only wastes the admin's time.
  if (missingRequired.length > 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: ctx.t("systemPages.importMissingColumns", {
        columns: missingRequired.join(", "),
      }),
    });
  }

  const cutoff = new Date(Date.now() - JOB_RETENTION_DAYS * 86_400_000);

  // No scheduler in this stack, so retention runs opportunistically here.
  // import_job_rows follow via ON DELETE CASCADE.
  await ctx.db
    .delete(ImportJobsTable)
    .where(
      and(
        eq(ImportJobsTable.createdBy, session.user.id),
        lt(ImportJobsTable.createdAt, cutoff),
      ),
    );

  const locale = ctx.cookies.get(LOCALE_COOKIE_NAME)?.value || "en";

  const [job] = await ctx.db
    .insert(ImportJobsTable)
    .values({
      entitySlug: spec.slug,
      branchId: input.branchId ?? null,
      locale,
      status: "validating",
      fileName: input.fileName,
      rawCsv: input.content,
      totalRows: parsed.rows.length,
      ignoredColumns,
      startedAt: new Date(),
      createdBy: session.user.id,
    })
    .returning();

  if (!job) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  }

  return job;
}

/**
 * Slices the stored CSV for one batch.
 *
 * Reparsing per call keeps the procedures stateless — there is no server-side
 * session state to lose between requests, so a resumed job behaves identically
 * to a fresh one. At the 4 MB ceiling this is cheap next to the queries below.
 */
function sliceBatch(rawCsv: string, spec: ImportEntitySpec, cursor: number) {
  const parsed = parseImportCsv(rawCsv);
  if (!parsed) return null;

  const { columnKeyByHeader } = matchImportHeaders(spec, parsed.headers);
  const slice = parsed.rows.slice(cursor, cursor + spec.batchSize);

  const rows = slice.map((cells, index) => {
    const keyedByHeader = toKeyedRow(parsed.headers, cells);
    const keyedByColumn: Record<string, string> = {};

    for (const [header, columnKey] of columnKeyByHeader) {
      keyedByColumn[columnKey] = keyedByHeader[header] ?? "";
    }

    return { rowNumber: cursor + index + 1, cells: keyedByColumn };
  });

  return { rows, totalRows: parsed.rows.length };
}

function assertCursorMatches(processedRows: number, cursor: number) {
  if (processedRows !== cursor) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "Import cursor is out of date",
    });
  }
}

export async function validateImportBatch(
  ctx: TRPCContext,
  input: ImportBatchInput,
) {
  const { job, session } = await loadJobForActor(ctx, input.jobId);

  if (job.status !== "validating") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: ctx.t("systemPages.importJobNotValidating"),
    });
  }

  assertCursorMatches(job.processedRows, input.cursor);

  const spec = getImportSpec(job.entitySlug);
  const handler = spec ? getImportHandler(spec.slug) : undefined;

  if (!spec || !handler) {
    throw new TRPCError({ code: "BAD_REQUEST" });
  }

  const batch = sliceBatch(job.rawCsv, spec, input.cursor);

  if (!batch) {
    await ctx.db
      .update(ImportJobsTable)
      .set({
        status: "failed",
        errorMessage: ctx.t("systemPages.importFileUnreadable"),
        finishedAt: new Date(),
      })
      .where(eq(ImportJobsTable.id, job.id));

    throw new TRPCError({
      code: "BAD_REQUEST",
      message: ctx.t("systemPages.importFileUnreadable"),
    });
  }

  const resolved = await handler.prepare(
    { ctx, db: ctx.db, session, spec, branchId: job.branchId },
    batch.rows,
  );

  const validCount = resolved.filter((row) => row.reasons.length === 0).length;
  const invalidCount = resolved.length - validCount;

  if (resolved.length > 0) {
    await ctx.db.insert(ImportJobRowsTable).values(
      resolved.map((row) => ({
        jobId: job.id,
        rowNumber: row.rowNumber,
        status:
          row.reasons.length === 0 ? ("valid" as const) : ("invalid" as const),
        action: row.action,
        reasons: translateReasons(ctx, row.reasons),
        values: row.values,
        targetId: row.targetId,
      })),
    );
  }

  const processedRows = input.cursor + batch.rows.length;
  const done = processedRows >= batch.totalRows;

  const [updated] = await ctx.db
    .update(ImportJobsTable)
    .set({
      processedRows,
      validRows: job.validRows + validCount,
      invalidRows: job.invalidRows + invalidCount,
      status: done ? "review" : "validating",
      updatedBy: session.user.id,
    })
    .where(eq(ImportJobsTable.id, job.id))
    .returning();

  return {
    processedRows,
    totalRows: batch.totalRows,
    done,
    validRows: updated?.validRows ?? 0,
    invalidRows: updated?.invalidRows ?? 0,
  };
}

export async function startImportCommit(
  ctx: TRPCContext,
  input: { jobId: string },
) {
  const { job, session } = await loadJobForActor(ctx, input.jobId);

  if (job.status !== "review") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: ctx.t("systemPages.importJobNotReviewable"),
    });
  }

  // The commit pass walks the same file from the top, so the cursor resets.
  const [updated] = await ctx.db
    .update(ImportJobsTable)
    .set({
      status: "committing",
      processedRows: 0,
      committedRows: 0,
      updatedBy: session.user.id,
    })
    .where(eq(ImportJobsTable.id, job.id))
    .returning();

  return updated;
}

export async function commitImportBatch(
  ctx: TRPCContext,
  input: ImportBatchInput,
) {
  const { job, session } = await loadJobForActor(ctx, input.jobId);

  if (job.status !== "committing") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: ctx.t("systemPages.importJobNotCommitting"),
    });
  }

  assertCursorMatches(job.processedRows, input.cursor);

  const spec = getImportSpec(job.entitySlug);
  const handler = spec ? getImportHandler(spec.slug) : undefined;

  if (!spec || !handler) {
    throw new TRPCError({ code: "BAD_REQUEST" });
  }

  const batch = sliceBatch(job.rawCsv, spec, input.cursor);

  if (!batch) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: ctx.t("systemPages.importFileUnreadable"),
    });
  }

  // Re-validated from the file rather than trusting the reviewed rows: the
  // database may have moved since the preview, so a stale review must never be
  // able to write.
  const resolved = await handler.prepare(
    { ctx, db: ctx.db, session, spec, branchId: job.branchId },
    batch.rows,
  );

  const writable = resolved.filter(
    (row) => row.reasons.length === 0 && row.action !== "skip",
  );

  let committed = 0;

  if (writable.length > 0) {
    // One transaction per batch, so a failure part-way leaves no half-written
    // batch behind and the cursor stays where it was.
    await ctx.db.transaction(async (tx) => {
      await handler.commit(
        { ctx, db: tx, session, spec, branchId: job.branchId },
        writable,
      );
    });
    committed = writable.length;
  }

  await markBatchRowOutcomes(ctx, job.id, resolved);

  const processedRows = input.cursor + batch.rows.length;
  const done = processedRows >= batch.totalRows;

  const [updated] = await ctx.db
    .update(ImportJobsTable)
    .set({
      processedRows,
      committedRows: job.committedRows + committed,
      status: done ? "completed" : "committing",
      finishedAt: done ? new Date() : null,
      updatedBy: session.user.id,
    })
    .where(eq(ImportJobsTable.id, job.id))
    .returning();

  return {
    processedRows,
    totalRows: batch.totalRows,
    done,
    committedRows: updated?.committedRows ?? 0,
  };
}

/** Records what actually happened to each reviewed row in this batch. */
async function markBatchRowOutcomes(
  ctx: TRPCContext,
  jobId: string,
  resolved: ResolvedRow[],
) {
  for (const row of resolved) {
    const status =
      row.reasons.length > 0
        ? ("invalid" as const)
        : row.action === "skip"
          ? ("skipped" as const)
          : ("done" as const);

    await ctx.db
      .update(ImportJobRowsTable)
      .set({
        status,
        action: row.action,
        reasons: translateReasons(ctx, row.reasons),
        targetId: row.targetId,
      })
      .where(
        and(
          eq(ImportJobRowsTable.jobId, jobId),
          eq(ImportJobRowsTable.rowNumber, row.rowNumber),
        ),
      );
  }
}

export async function cancelImportJob(
  ctx: TRPCContext,
  input: { jobId: string },
) {
  const { job, session } = await loadJobForActor(ctx, input.jobId);

  if (job.status === "completed") {
    throw new TRPCError({ code: "BAD_REQUEST" });
  }

  const [updated] = await ctx.db
    .update(ImportJobsTable)
    .set({
      status: "cancelled",
      finishedAt: new Date(),
      updatedBy: session.user.id,
    })
    .where(eq(ImportJobsTable.id, job.id))
    .returning();

  return updated;
}
