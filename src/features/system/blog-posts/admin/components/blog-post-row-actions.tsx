"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  GlobeIcon,
  InfoIcon,
  MoreHorizontalIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "@/features/core/i18n/client";
import { useTRPC } from "@/integrations/trpc/client";
import type { BlogPostRow } from "@/integrations/trpc/routers/blog-posts";

export type BlogPostRowActionVariant = "info" | "edit" | "delete";

export type SetBlogPostRowAction = (
  next: { row: BlogPostRow; variant: BlogPostRowActionVariant } | null,
) => void;

type Props = { row: BlogPostRow; setRowAction: SetBlogPostRowAction };

export function BlogPostRowActions({ row, setRowAction }: Props) {
  const { t } = useTranslation();
  const trpc = useTRPC();
  const qc = useQueryClient();

  const publishMut = useMutation(
    trpc.blogPosts.publish.mutationOptions({
      onSuccess: () => {
        toast.success(String(t("blogPosts.postPublished")));
        void qc.invalidateQueries(trpc.blogPosts.list.queryFilter());
      },
      onError: () => toast.error(String(t("blogPosts.postSaveFailed"))),
    }),
  );

  const unpublishMut = useMutation(
    trpc.blogPosts.unpublish.mutationOptions({
      onSuccess: () => {
        toast.success(String(t("blogPosts.postArchived")));
        void qc.invalidateQueries(trpc.blogPosts.list.queryFilter());
      },
    }),
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className="size-8"
            aria-label={String(t("common.openMenu"))}
          >
            <MoreHorizontalIcon className="size-3.5" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem
          onClick={() => setRowAction({ row, variant: "info" })}
        >
          <InfoIcon className="size-3.5" />
          {String(t("common.info"))}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setRowAction({ row, variant: "edit" })}
        >
          <PencilIcon className="size-3.5" />
          {String(t("common.edit"))}
        </DropdownMenuItem>
        {row.status === "draft" && (
          <DropdownMenuItem
            disabled={publishMut.isPending}
            onClick={() => publishMut.mutate({ id: row.id })}
          >
            <GlobeIcon className="size-3.5" />
            {String(t("blogPosts.publishPost"))}
          </DropdownMenuItem>
        )}
        {row.status === "published" && (
          <DropdownMenuItem
            disabled={unpublishMut.isPending}
            onClick={() => unpublishMut.mutate({ id: row.id })}
          >
            <GlobeIcon className="size-3.5 opacity-50" />
            {String(t("blogPosts.unpublishPost"))}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => setRowAction({ row, variant: "delete" })}
        >
          <Trash2Icon className="size-3.5 text-destructive" />
          <span className="text-destructive">{String(t("common.delete"))}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
