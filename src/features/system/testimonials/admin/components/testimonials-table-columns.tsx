"use client";

import type { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import {
  createEntityActionsColumn,
  createSelectColumn,
  DataTableColumnHeader,
} from "@/features/core/data-table";
import type { useTranslation } from "@/features/core/i18n/client";
import type { Testimonial } from "@/integrations/trpc/routers/testimonials";

import {
  type SetTestimonialRowAction,
  TestimonialRowActions,
} from "./testimonial-row-actions";

type Translate = ReturnType<typeof useTranslation>["t"];

export function buildTestimonialColumns(opts: {
  t: Translate;
  locale: string;
  setRowAction: SetTestimonialRowAction;
}): ColumnDef<Testimonial>[] {
  const { t, locale, setRowAction } = opts;
  const dateFmt = new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", {
    dateStyle: "medium",
  });

  return [
    createSelectColumn<Testimonial>(),
    {
      accessorKey: "clientName",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("testimonials.clientName"))}
        />
      ),
      meta: {
        label: String(t("testimonials.clientName")),
        filterVariant: "text",
      },
    },
    {
      accessorKey: "company",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("testimonials.company"))}
        />
      ),
      meta: { label: String(t("testimonials.company")), filterVariant: "text" },
    },
    {
      accessorKey: "role",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("testimonials.role"))}
        />
      ),
      meta: { label: String(t("testimonials.role")) },
      cell: ({ row }) => row.original.role ?? "—",
    },
    {
      accessorKey: "isVisible",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("testimonials.isVisible"))}
        />
      ),
      meta: { label: String(t("testimonials.isVisible")) },
      cell: ({ row }) => (
        <Badge variant={row.original.isVisible ? "default" : "secondary"}>
          {row.original.isVisible
            ? String(t("common.active"))
            : String(t("common.inactive"))}
        </Badge>
      ),
    },
    {
      accessorKey: "sortOrder",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("testimonials.sortOrder"))}
        />
      ),
      meta: { label: String(t("testimonials.sortOrder")) },
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
        <TestimonialRowActions row={row.original} setRowAction={setRowAction} />
      ),
    }),
  ];
}
