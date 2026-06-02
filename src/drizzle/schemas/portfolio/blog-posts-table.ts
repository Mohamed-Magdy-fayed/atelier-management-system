import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

import {
  createdAt,
  createdBy,
  deletedAt,
  deletedBy,
  id,
  updatedAt,
  updatedBy,
} from "@/drizzle/schemas/helpers";

export const blogPostStatusValues = ["draft", "published"] as const;
export type BlogPostStatus = (typeof blogPostStatusValues)[number];
export const blogPostStatusEnum = pgEnum(
  "blog_post_status",
  blogPostStatusValues,
);

export const BlogPostsTable = pgTable(
  "blog_posts",
  {
    id,
    title: varchar({ length: 255 }).notNull(),
    slug: varchar({ length: 255 }).notNull().unique(),
    excerpt: varchar({ length: 512 }).notNull(),
    content: text().notNull(),
    coverImageUrl: varchar({ length: 1024 }),
    authorName: varchar({ length: 255 })
      .notNull()
      .default("Gateling Solutions"),
    tags: varchar({ length: 128 }).array(),
    status: blogPostStatusEnum().notNull().default("draft"),
    publishedAt: timestamp({ withTimezone: true }),
    createdBy,
    createdAt,
    updatedBy,
    updatedAt,
    deletedBy,
    deletedAt,
  },
  (table) => [
    index("blog_posts_status_idx").on(table.status),
    index("blog_posts_slug_idx").on(table.slug),
  ],
);

export type BlogPost = typeof BlogPostsTable.$inferSelect;
export type NewBlogPost = typeof BlogPostsTable.$inferInsert;
