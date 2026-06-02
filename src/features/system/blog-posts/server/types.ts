import type { BlogPost } from "@/drizzle/schema";

export type BlogPostRow = Pick<
  BlogPost,
  | "id"
  | "title"
  | "slug"
  | "excerpt"
  | "authorName"
  | "tags"
  | "status"
  | "publishedAt"
  | "coverImageUrl"
  | "createdAt"
  | "updatedAt"
>;
