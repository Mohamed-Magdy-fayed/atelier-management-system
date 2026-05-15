"use client";

import type { ColumnDef } from "@tanstack/react-table";

import { DataTableColumnHeader } from "@/features/core/data-table";
import type { useTranslation } from "@/features/core/i18n/client";
import type { BranchGridRow } from "@/integrations/trpc/routers/branches";

import {
  BranchRowActions,
  type SetBranchRowAction,
} from "./branch-row-actions";

type Translate = ReturnType<typeof useTranslation>["t"];

export function buildBranchColumns(opts: {
  locale: string;
  setRowAction: SetBranchRowAction;
  t: Translate;
}): ColumnDef<BranchGridRow>[] {
  const { locale, setRowAction, t } = opts;
  const dateFmt = new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return [
    {
      accessorKey: "nameEn",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("systemPages.branchesNameEn"))}
        />
      ),
      meta: { label: String(t("systemPages.branchesNameEn")) },
    },
    {
      accessorKey: "nameAr",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("systemPages.branchesNameAr"))}
        />
      ),
      meta: { label: String(t("systemPages.branchesNameAr")) },
    },
    {
      accessorKey: "phone",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("systemPages.branchesPhone"))}
        />
      ),
      meta: { label: String(t("systemPages.branchesPhone")) },
      cell: ({ row }) => row.original.phone ?? "—",
    },
    {
      accessorKey: "ownerName",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("systemPages.branchesOwner"))}
        />
      ),
      meta: { label: String(t("systemPages.branchesOwner")) },
      cell: ({ row }) => row.original.ownerName ?? "—",
    },
    {
      accessorKey: "memberCount",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("systemPages.branchesMemberCount"))}
        />
      ),
      meta: { label: String(t("systemPages.branchesMemberCount")) },
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("common.createdAt"))}
        />
      ),
      meta: { label: String(t("common.createdAt")) },
      cell: ({ row }) =>
        row.original.createdAt
          ? dateFmt.format(new Date(row.original.createdAt))
          : "—",
    },
    {
      accessorKey: "updatedAt",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("common.updatedAt"))}
        />
      ),
      meta: { label: String(t("common.updatedAt")) },
      cell: ({ row }) =>
        row.original.updatedAt
          ? dateFmt.format(new Date(row.original.updatedAt))
          : "—",
    },
    {
      id: "actions",
      enableHiding: false,
      enableSorting: false,
      size: 48,
      meta: { label: String(t("common.actions")) },
      header: () => (
        <span className="text-xs font-medium">
          {String(t("common.actions"))}
        </span>
      ),
      cell: ({ row }) => (
        <BranchRowActions row={row.original} setRowAction={setRowAction} />
      ),
    },
  ];
}
