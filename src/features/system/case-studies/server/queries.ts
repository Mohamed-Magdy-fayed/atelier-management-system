import { and, asc, count, desc, eq, ilike, isNull, or } from "drizzle-orm";

import { CaseStudiesTable } from "@/drizzle/schema";
import type { ListCaseStudiesInput } from "./schemas";
import {
  assertAdminRole,
  getRequiredSession,
  type TRPCContext,
} from "./shared";
import type { CaseStudyRow } from "./types";

export async function listCaseStudies(
  ctx: TRPCContext,
  input: ListCaseStudiesInput,
) {
  const session = getRequiredSession(ctx);
  assertAdminRole(session.user.role);

  const conditions = [isNull(CaseStudiesTable.deletedAt)];

  if (input.status && input.status !== "all") {
    conditions.push(eq(CaseStudiesTable.status, input.status));
  }
  if (input.industry) {
    conditions.push(eq(CaseStudiesTable.industry, input.industry));
  }
  if (input.globalFilter?.trim()) {
    const like = `%${input.globalFilter.trim()}%`;
    conditions.push(
      or(
        ilike(CaseStudiesTable.title, like),
        ilike(CaseStudiesTable.client, like),
        ilike(CaseStudiesTable.industry, like),
      ) ?? isNull(CaseStudiesTable.deletedAt),
    );
  }

  const where = and(...conditions);
  const [{ total }] = await ctx.db
    .select({ total: count() })
    .from(CaseStudiesTable)
    .where(where);

  const pageCount = Math.max(1, Math.ceil(Number(total) / input.perPage));
  const page = Math.min(input.page, pageCount);
  const offset = (page - 1) * input.perPage;

  const firstSort = input.sorting[0];
  const orderBy = firstSort
    ? firstSort.id === "title"
      ? firstSort.desc
        ? [desc(CaseStudiesTable.title)]
        : [asc(CaseStudiesTable.title)]
      : firstSort.id === "createdAt"
        ? firstSort.desc
          ? [desc(CaseStudiesTable.createdAt)]
          : [asc(CaseStudiesTable.createdAt)]
        : [asc(CaseStudiesTable.sortOrder), desc(CaseStudiesTable.createdAt)]
    : [asc(CaseStudiesTable.sortOrder), desc(CaseStudiesTable.createdAt)];

  const rows = await ctx.db
    .select({
      id: CaseStudiesTable.id,
      title: CaseStudiesTable.title,
      slug: CaseStudiesTable.slug,
      client: CaseStudiesTable.client,
      industry: CaseStudiesTable.industry,
      status: CaseStudiesTable.status,
      publishedAt: CaseStudiesTable.publishedAt,
      sortOrder: CaseStudiesTable.sortOrder,
      coverImageUrl: CaseStudiesTable.coverImageUrl,
      liveUrl: CaseStudiesTable.liveUrl,
      results: CaseStudiesTable.results,
      createdAt: CaseStudiesTable.createdAt,
      updatedAt: CaseStudiesTable.updatedAt,
    })
    .from(CaseStudiesTable)
    .where(where)
    .orderBy(...orderBy)
    .limit(input.perPage)
    .offset(offset);

  return { rows: rows as CaseStudyRow[], pageCount, total: Number(total) };
}

export async function getCaseStudyById(ctx: TRPCContext, id: string) {
  return ctx.db.query.CaseStudiesTable.findFirst({
    where: and(eq(CaseStudiesTable.id, id), isNull(CaseStudiesTable.deletedAt)),
  });
}

export async function listPublishedCaseStudies(ctx: TRPCContext) {
  return ctx.db
    .select({
      id: CaseStudiesTable.id,
      slug: CaseStudiesTable.slug,
      client: CaseStudiesTable.client,
      industry: CaseStudiesTable.industry,
      problemStatement: CaseStudiesTable.problemStatement,
      solution: CaseStudiesTable.solution,
      results: CaseStudiesTable.results,
      liveUrl: CaseStudiesTable.liveUrl,
      coverImageUrl: CaseStudiesTable.coverImageUrl,
      sortOrder: CaseStudiesTable.sortOrder,
    })
    .from(CaseStudiesTable)
    .where(
      and(
        eq(CaseStudiesTable.status, "published"),
        isNull(CaseStudiesTable.deletedAt),
      ),
    )
    .orderBy(asc(CaseStudiesTable.sortOrder), desc(CaseStudiesTable.createdAt));
}

export async function getPublishedCaseStudyBySlug(
  ctx: TRPCContext,
  slug: string,
) {
  return ctx.db.query.CaseStudiesTable.findFirst({
    where: and(
      eq(CaseStudiesTable.slug, slug),
      eq(CaseStudiesTable.status, "published"),
      isNull(CaseStudiesTable.deletedAt),
    ),
  });
}
