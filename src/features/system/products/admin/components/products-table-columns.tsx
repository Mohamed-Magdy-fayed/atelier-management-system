"use client";

import type { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import { DataTableColumnHeader } from "@/features/core/data-table";
import type { useTranslation } from "@/features/core/i18n/client";
import type { ProductGridRow } from "@/integrations/trpc/routers/products";

import { ProductRowActions, type SetProductRowAction } from "./product-row-actions";

type Translate = ReturnType<typeof useTranslation>["t"];

export function buildProductColumns(opts: {
  locale: string;
  setRowAction: SetProductRowAction;
  t: Translate;
}): ColumnDef<ProductGridRow>[] {
  const { locale, setRowAction, t } = opts;
  const dateFmt = new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const moneyFmt = new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-EG", {
    style: "currency",
    currency: "EGP",
  });

  return [
    {
      accessorKey: "code",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("systemPages.productsCode"))}
        />
      ),
      meta: { label: String(t("systemPages.productsCode")) },
    },
    {
      accessorKey: "nameEn",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("systemPages.productsNameEn"))}
        />
      ),
      meta: { label: String(t("systemPages.productsNameEn")) },
    },
    {
      accessorKey: "nameAr",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("systemPages.productsNameAr"))}
        />
      ),
      meta: { label: String(t("systemPages.productsNameAr")) },
    },
    {
      accessorKey: "price",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("systemPages.productsPrice"))}
        />
      ),
      meta: { label: String(t("systemPages.productsPrice")) },
      cell: ({ row }) => moneyFmt.format(row.original.price),
    },
    {
      accessorKey: "isActive",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("systemPages.productsStatus"))}
        />
      ),
      meta: { label: String(t("systemPages.productsStatus")) },
      cell: ({ row }) =>
        row.original.isActive ? (
          <Badge variant="secondary">{String(t("common.active"))}</Badge>
        ) : (
          <Badge variant="outline">{String(t("common.inactive"))}</Badge>
        ),
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
      id: "actions",
      enableHiding: false,
      enableSorting: false,
      size: 48,
      meta: { label: String(t("common.actions")) },
      header: () => (
        <span className="text-xs font-medium">{String(t("common.actions"))}</span>
      ),
      cell: ({ row }) => (
        <ProductRowActions row={row.original} setRowAction={setRowAction} />
      ),
    },
  ];
}
