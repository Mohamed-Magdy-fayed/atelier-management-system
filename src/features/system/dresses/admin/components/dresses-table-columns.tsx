"use client";

import type { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import {
  createSelectColumn,
  DataTableColumnHeader,
} from "@/features/core/data-table";
import type { useTranslation } from "@/features/core/i18n/client";
import type { DressGridRow } from "@/integrations/trpc/routers/dresses";
import { DressRowActions, type SetDressRowAction } from "./dress-row-actions";
import { DressViewDialog } from "./dress-view-dialog";

type Translate = ReturnType<typeof useTranslation>["t"];

export function buildDressColumns(opts: {
  locale: string;
  setRowAction: SetDressRowAction;
  t: Translate;
}): ColumnDef<DressGridRow>[] {
  const { setRowAction, t } = opts;

  return [
    createSelectColumn<DressGridRow>(),
    {
      accessorKey: "code",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("systemPages.dressesCode"))}
        />
      ),
      cell: ({ row }) => (
        <DressViewDialog
          dressId={row.original.id}
          dressLabel={row.original.code}
        />
      ),
      meta: { label: String(t("systemPages.dressesCode")) },
    },
    {
      accessorKey: "title",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("systemPages.dressesTitleCol"))}
        />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.original.title}</span>
      ),
      meta: { label: String(t("systemPages.dressesTitleCol")) },
    },
    {
      accessorKey: "pricePerDay",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("systemPages.dressesPricePerDay"))}
        />
      ),
      meta: { label: String(t("systemPages.dressesPricePerDay")) },
    },
    {
      accessorKey: "isActive",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("systemPages.dressesStatus"))}
        />
      ),
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? "default" : "secondary"}>
          {String(
            t(
              row.original.isActive
                ? "systemPages.dressesActive"
                : "systemPages.dressesInactive",
            ),
          )}
        </Badge>
      ),
      meta: { label: String(t("systemPages.dressesStatus")) },
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("common.createdAt"))}
        />
      ),
      cell: ({ row }) => {
        const fmt = new Intl.DateTimeFormat(
          opts.locale === "ar" ? "ar" : "en",
          {
            dateStyle: "medium",
          },
        );
        return fmt.format(new Date(row.original.createdAt));
      },
      meta: { label: String(t("common.createdAt")) },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DressRowActions row={row.original} setRowAction={setRowAction} />
      ),
    },
  ];
}
