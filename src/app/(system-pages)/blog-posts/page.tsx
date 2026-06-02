import { BlogPostsTablePage } from "@/features/system/blog-posts/admin";
import { HydrateClient } from "@/integrations/trpc/server";

export default function BlogPostsPage() {
  return (
    <HydrateClient>
      <BlogPostsTablePage />
    </HydrateClient>
  );
}
