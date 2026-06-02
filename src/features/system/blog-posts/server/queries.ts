import { and, asc, count, desc, eq, ilike, isNull, or } from "drizzle-orm";

import { BlogPostsTable } from "@/drizzle/schema";
import type { ListBlogPostsInput } from "./schemas";
import {
  assertAdminRole,
  getRequiredSession,
  type TRPCContext,
} from "./shared";

export async function listBlogPosts(
  ctx: TRPCContext,
  input: ListBlogPostsInput,
) {
  const session = getRequiredSession(ctx);
  assertAdminRole(session.user.role);

  const conditions = [isNull(BlogPostsTable.deletedAt)];
  if (input.status && input.status !== "all") {
    conditions.push(eq(BlogPostsTable.status, input.status));
  }
  if (input.globalFilter?.trim()) {
    const like = `%${input.globalFilter.trim()}%`;
    conditions.push(
      or(
        ilike(BlogPostsTable.title, like),
        ilike(BlogPostsTable.excerpt, like),
      ) ?? isNull(BlogPostsTable.deletedAt),
    );
  }

  const where = and(...conditions);
  const [{ total }] = await ctx.db
    .select({ total: count() })
    .from(BlogPostsTable)
    .where(where);

  const pageCount = Math.max(1, Math.ceil(Number(total) / input.perPage));
  const page = Math.min(input.page, pageCount);
  const offset = (page - 1) * input.perPage;

  const firstSort = input.sorting[0];
  const orderBy =
    firstSort?.id === "createdAt"
      ? [
          firstSort.desc
            ? desc(BlogPostsTable.createdAt)
            : asc(BlogPostsTable.createdAt),
        ]
      : [desc(BlogPostsTable.createdAt)];

  const rows = await ctx.db
    .select({
      id: BlogPostsTable.id,
      title: BlogPostsTable.title,
      slug: BlogPostsTable.slug,
      excerpt: BlogPostsTable.excerpt,
      authorName: BlogPostsTable.authorName,
      tags: BlogPostsTable.tags,
      status: BlogPostsTable.status,
      publishedAt: BlogPostsTable.publishedAt,
      coverImageUrl: BlogPostsTable.coverImageUrl,
      createdAt: BlogPostsTable.createdAt,
      updatedAt: BlogPostsTable.updatedAt,
    })
    .from(BlogPostsTable)
    .where(where)
    .orderBy(...orderBy)
    .limit(input.perPage)
    .offset(offset);

  return { rows, pageCount, total: Number(total) };
}
