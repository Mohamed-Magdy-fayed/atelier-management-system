import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "@/integrations/trpc/init";
import {
  createBlogPost,
  deleteBlogPost,
  publishBlogPost,
  unpublishBlogPost,
  updateBlogPost,
} from "./mutations";
import { listBlogPosts } from "./queries";
import {
  blogPostMutationSchema,
  blogPostUpdateSchema,
  listBlogPostsInput,
} from "./schemas";

export const blogPostsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(listBlogPostsInput)
    .query(({ ctx, input }) => listBlogPosts(ctx, input)),
  create: protectedProcedure
    .input(blogPostMutationSchema)
    .mutation(({ ctx, input }) => createBlogPost(ctx, input)),
  update: protectedProcedure
    .input(blogPostUpdateSchema)
    .mutation(({ ctx, input }) => updateBlogPost(ctx, input)),
  publish: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ ctx, input }) => publishBlogPost(ctx, input.id)),
  unpublish: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ ctx, input }) => unpublishBlogPost(ctx, input.id)),
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ ctx, input }) => deleteBlogPost(ctx, input.id)),
});
