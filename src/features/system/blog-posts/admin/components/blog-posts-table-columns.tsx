"use client";

import type { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import {
  createEntityActionsColumn,
  createSelectColumn,
  DataTableColumnHeader,
} from "@/features/core/data-table";
import type { useTranslation } from "@/features/core/i18n/client";
import type { BlogPostRow } from "@/integrations/trpc/routers/blog-posts";

import {
  BlogPostRowActions,
  type SetBlogPostRowAction,
} from "./blog-post-row-actions";

type Translate = ReturnType<typeof useTranslation>["t"];

export function buildBlogPostColumns(opts: {
  t: Translate;
  locale: string;
  setRowAction: SetBlogPostRowAction;
}): ColumnDef<BlogPostRow>[] {
  const { t, locale, setRowAction } = opts;
  const dateFmt = new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", {
    dateStyle: "medium",
  });

  return [
    createSelectColumn<BlogPostRow>(),
    {
      accessorKey: "title",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("blogPosts.postTitle"))}
        />
      ),
      meta: { label: String(t("blogPosts.postTitle")), filterVariant: "text" },
    },
    {
      accessorKey: "authorName",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("blogPosts.author"))}
        />
      ),
      meta: { label: String(t("blogPosts.author")), filterVariant: "text" },
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("blogPosts.status"))}
        />
      ),
      meta: { label: String(t("blogPosts.status")) },
      cell: ({ row }) => (
        <Badge
          variant={
            row.original.status === "published" ? "default" : "secondary"
          }
        >
          {String(t(`blogPosts.statusValues.${row.original.status}`))}
        </Badge>
      ),
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("forms.createdAt"))}
        />
      ),
      meta: { label: String(t("forms.createdAt")) },
      cell: ({ row }) =>
        row.original.createdAt
          ? dateFmt.format(new Date(row.original.createdAt))
          : "—",
    },
    createEntityActionsColumn({
      t,
      size: 48,
      cell: ({ row }) => (
        <BlogPostRowActions row={row.original} setRowAction={setRowAction} />
      ),
    }),
  ];
}
