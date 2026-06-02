import { z } from "zod";

import { translationKey } from "@/features/core/i18n/global";

const required = translationKey("forms.validation.required");
const max255 = translationKey("forms.validation.max255");

export const blogPostMutationSchema = z.object({
  title: z.string().trim().min(1, required).max(255, max255),
  slug: z
    .string()
    .trim()
    .min(1, required)
    .max(255, max255)
    .regex(/^[a-z0-9-]+$/, translationKey("forms.validation.slugFormat")),
  excerpt: z.string().trim().min(1, required).max(512),
  content: z.string().trim().min(1, required),
  coverImageUrl: z.string().max(1024).optional().nullable(),
  authorName: z
    .string()
    .trim()
    .min(1, required)
    .max(255, max255)
    .default("Gateling Solutions"),
  tags: z.array(z.string().trim().max(128)).optional().default([]),
});

export const blogPostUpdateSchema = blogPostMutationSchema.extend({
  id: z.string().uuid(),
});

export const listBlogPostsInput = z.object({
  page: z.number().int().min(1).default(1),
  perPage: z.number().int().min(1).max(100).default(20),
  sorting: z.array(z.object({ id: z.string(), desc: z.boolean() })).default([]),
  globalFilter: z.string().optional(),
  status: z.enum(["draft", "published", "all"]).optional().default("all"),
});

export type BlogPostMutationInput = z.infer<typeof blogPostMutationSchema>;
export type BlogPostUpdateInput = z.infer<typeof blogPostUpdateSchema>;
export type ListBlogPostsInput = z.infer<typeof listBlogPostsInput>;
