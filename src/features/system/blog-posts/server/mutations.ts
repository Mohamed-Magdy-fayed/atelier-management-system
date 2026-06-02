import { TRPCError } from "@trpc/server";
import { and, eq, isNull, ne } from "drizzle-orm";

import { BlogPostsTable } from "@/drizzle/schema";
import { blogPostPublishedEvent, inngest } from "@/integrations/inngest/client";
import type { BlogPostMutationInput, BlogPostUpdateInput } from "./schemas";
import {
  assertAdminRole,
  getRequiredSession,
  type TRPCContext,
} from "./shared";

async function assertUniqueSlug(
  ctx: TRPCContext,
  slug: string,
  excludeId?: string,
) {
  const existing = await ctx.db.query.BlogPostsTable.findFirst({
    columns: { id: true },
    where: excludeId
      ? and(
          eq(BlogPostsTable.slug, slug),
          ne(BlogPostsTable.id, excludeId),
          isNull(BlogPostsTable.deletedAt),
        )
      : and(eq(BlogPostsTable.slug, slug), isNull(BlogPostsTable.deletedAt)),
  });
  if (existing)
    throw new TRPCError({
      code: "CONFLICT",
      message: ctx.t("blogPosts.slugDuplicate"),
    });
}

export async function createBlogPost(
  ctx: TRPCContext,
  input: BlogPostMutationInput,
) {
  const session = getRequiredSession(ctx);
  assertAdminRole(session.user.role);
  await assertUniqueSlug(ctx, input.slug);
  const [row] = await ctx.db
    .insert(BlogPostsTable)
    .values({
      ...input,
      coverImageUrl: input.coverImageUrl ?? null,
      createdBy: session.user.id,
    })
    .returning({ id: BlogPostsTable.id });
  return { id: row.id };
}

export async function updateBlogPost(
  ctx: TRPCContext,
  input: BlogPostUpdateInput,
) {
  const session = getRequiredSession(ctx);
  assertAdminRole(session.user.role);
  await assertUniqueSlug(ctx, input.slug, input.id);
  const { id, ...data } = input;
  await ctx.db
    .update(BlogPostsTable)
    .set({
      ...data,
      coverImageUrl: data.coverImageUrl ?? null,
      updatedBy: session.user.id,
    })
    .where(eq(BlogPostsTable.id, id));
  return { updated: true };
}

export async function publishBlogPost(ctx: TRPCContext, id: string) {
  const session = getRequiredSession(ctx);
  assertAdminRole(session.user.role);
  const existing = await ctx.db.query.BlogPostsTable.findFirst({
    columns: { id: true, slug: true, publishedAt: true },
    where: and(eq(BlogPostsTable.id, id), isNull(BlogPostsTable.deletedAt)),
  });
  if (!existing)
    throw new TRPCError({ code: "NOT_FOUND", message: "Post not found" });
  await ctx.db
    .update(BlogPostsTable)
    .set({
      status: "published",
      publishedAt: existing.publishedAt ?? new Date(),
      updatedBy: session.user.id,
    })
    .where(eq(BlogPostsTable.id, id));
  await inngest.send(
    blogPostPublishedEvent.create({ blogPostId: id, slug: existing.slug }),
  );
  return { published: true };
}

export async function unpublishBlogPost(ctx: TRPCContext, id: string) {
  const session = getRequiredSession(ctx);
  assertAdminRole(session.user.role);
  await ctx.db
    .update(BlogPostsTable)
    .set({ status: "draft", updatedBy: session.user.id })
    .where(and(eq(BlogPostsTable.id, id), isNull(BlogPostsTable.deletedAt)));
  return { unpublished: true };
}

export async function deleteBlogPost(ctx: TRPCContext, id: string) {
  const session = getRequiredSession(ctx);
  assertAdminRole(session.user.role);
  await ctx.db
    .update(BlogPostsTable)
    .set({ deletedAt: new Date(), deletedBy: session.user.id })
    .where(eq(BlogPostsTable.id, id));
  return { deleted: true };
}
