"use client";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "@/features/core/i18n/client";
import type { BlogPostRow } from "@/integrations/trpc/routers/blog-posts";

type Props = {
  post: BlogPostRow | null;
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

export function BlogPostInfoModal({ post, onOpenChange, open }: Props) {
  const { t, locale } = useTranslation();
  const dateFmt = new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{post?.title ?? "—"}</DialogTitle>
          <DialogDescription>{post?.authorName ?? ""}</DialogDescription>
        </DialogHeader>
        {post && (
          <div className="space-y-3 text-sm">
            <div className="flex gap-2">
              <Badge
                variant={post.status === "published" ? "default" : "secondary"}
              >
                {String(t(`blogPosts.statusValues.${post.status}`))}
              </Badge>
              {(post.tags ?? []).map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
            <Separator />
            <p className="text-muted-foreground leading-relaxed">
              {post.excerpt}
            </p>
            <Separator />
            <div className="text-muted-foreground grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="font-medium">
                  {String(t("common.createdAt"))}:
                </span>{" "}
                {post.createdAt
                  ? dateFmt.format(new Date(post.createdAt))
                  : "—"}
              </div>
              {post.publishedAt && (
                <div>
                  <span className="font-medium">Published:</span>{" "}
                  {dateFmt.format(new Date(post.publishedAt))}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
