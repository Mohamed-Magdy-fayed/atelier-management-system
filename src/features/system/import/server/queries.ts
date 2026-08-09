import { TRPCError } from "@trpc/server";
import { and, asc, count, desc, eq } from "drizzle-orm";

import { ImportJobRowsTable, ImportJobsTable } from "@/drizzle/schema";
import { assertOperationalStaff } from "@/features/system/shared/staff-access";

import type {
  ImportJobIdInput,
  ListImportJobRowsInput,
  ListImportJobsInput,
} from "./schemas";
import { getRequiredSession, type TRPCContext } from "./shared";

export async function getImportJob(ctx: TRPCContext, input: ImportJobIdInput) {
  const session = getRequiredSession(ctx);
  assertOperationalStaff(session.user.role);

  const job = await ctx.db.query.ImportJobsTable.findFirst({
    where: eq(ImportJobsTable.id, input.jobId),
    // rawCsv is excluded: it is up to 4 MB and the client never needs it back.
    columns: { rawCsv: false },
  });

  if (!job) {
    throw new TRPCError({ code: "NOT_FOUND" });
  }

  if (job.createdBy !== session.user.id && session.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }

  return job;
}

export async function listImportJobRows(
  ctx: TRPCContext,
  input: ListImportJobRowsInput,
) {
  // Ownership is enforced by loading the job first.
  await getImportJob(ctx, { jobId: input.jobId });

  const where =
    input.filter === "all"
      ? eq(ImportJobRowsTable.jobId, input.jobId)
      : and(
          eq(ImportJobRowsTable.jobId, input.jobId),
          eq(ImportJobRowsTable.status, input.filter),
        );

  const [rows, [total]] = await Promise.all([
    ctx.db
      .select()
      .from(ImportJobRowsTable)
      .where(where)
      .orderBy(asc(ImportJobRowsTable.rowNumber))
      .limit(input.perPage)
      .offset((input.page - 1) * input.perPage),
    ctx.db.select({ value: count() }).from(ImportJobRowsTable).where(where),
  ]);

  return { rows, total: total?.value ?? 0 };
}

/** Every invalid row, for the downloadable error report. */
export async function listInvalidImportRows(
  ctx: TRPCContext,
  input: ImportJobIdInput,
) {
  await getImportJob(ctx, input);

  const rows = await ctx.db
    .select()
    .from(ImportJobRowsTable)
    .where(
      and(
        eq(ImportJobRowsTable.jobId, input.jobId),
        eq(ImportJobRowsTable.status, "invalid"),
      ),
    )
    .orderBy(asc(ImportJobRowsTable.rowNumber));

  return { rows };
}

export async function listImportJobs(
  ctx: TRPCContext,
  input: ListImportJobsInput,
) {
  const session = getRequiredSession(ctx);
  assertOperationalStaff(session.user.role);

  const where = input.entitySlug
    ? and(
        eq(ImportJobsTable.createdBy, session.user.id),
        eq(ImportJobsTable.entitySlug, input.entitySlug),
      )
    : eq(ImportJobsTable.createdBy, session.user.id);

  const jobs = await ctx.db.query.ImportJobsTable.findMany({
    where,
    columns: { rawCsv: false },
    orderBy: desc(ImportJobsTable.createdAt),
    limit: input.limit,
  });

  return { jobs };
}
