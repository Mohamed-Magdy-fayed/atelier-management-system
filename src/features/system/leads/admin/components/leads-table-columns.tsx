"use client";

import type { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import {
  createEntityActionsColumn,
  createSelectColumn,
  DataTableColumnHeader,
} from "@/features/core/data-table";
import type { useTranslation } from "@/features/core/i18n/client";
import type { Lead } from "@/integrations/trpc/routers/leads";

import { LeadRowActions, type SetLeadRowAction } from "./lead-row-actions";

type Translate = ReturnType<typeof useTranslation>["t"];

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  new: "default",
  contacted: "secondary",
  qualified: "outline",
  closed: "secondary",
};

export function buildLeadColumns(opts: {
  t: Translate;
  locale: string;
  setRowAction: SetLeadRowAction;
}): ColumnDef<Lead>[] {
  const { t, locale, setRowAction } = opts;
  const dateFmt = new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", {
    dateStyle: "medium",
  });

  return [
    createSelectColumn<Lead>(),
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("leads.name"))}
        />
      ),
      meta: { label: String(t("leads.name")), filterVariant: "text" },
    },
    {
      accessorKey: "email",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("leads.email"))}
        />
      ),
      meta: { label: String(t("leads.email")), filterVariant: "text" },
    },
    {
      accessorKey: "company",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("leads.company"))}
        />
      ),
      meta: { label: String(t("leads.company")) },
      cell: ({ row }) => row.original.company ?? "—",
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("leads.status"))}
        />
      ),
      meta: { label: String(t("leads.status")) },
      cell: ({ row }) => (
        <Badge variant={STATUS_VARIANT[row.original.status] ?? "secondary"}>
          {String(t(`leads.statusValues.${row.original.status}`))}
        </Badge>
      ),
    },
    {
      accessorKey: "message",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("leads.message"))}
        />
      ),
      meta: { label: String(t("leads.message")) },
      cell: ({ row }) => (
        <span className="block max-w-[220px] truncate text-sm">
          {row.original.message}
        </span>
      ),
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("leads.createdAt"))}
        />
      ),
      meta: { label: String(t("leads.createdAt")) },
      cell: ({ row }) =>
        row.original.createdAt
          ? dateFmt.format(new Date(row.original.createdAt))
          : "—",
    },
    createEntityActionsColumn({
      t,
      size: 48,
      cell: ({ row }) => (
        <LeadRowActions row={row.original} setRowAction={setRowAction} />
      ),
    }),
  ];
}
