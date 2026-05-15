"use client";

import type { ColumnDef } from "@tanstack/react-table";

import { DataTableColumnHeader } from "@/features/core/data-table";
import type { useTranslation } from "@/features/core/i18n/client";
import type { RentalCustomerGridRow } from "@/integrations/trpc/routers/rental-customers";

type Translate = ReturnType<typeof useTranslation>["t"];

export function buildRentalCustomerColumns(opts: {
  locale: string;
  t: Translate;
}): ColumnDef<RentalCustomerGridRow>[] {
  const { locale, t } = opts;
  const dateFmt = new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("forms.name"))}
        />
      ),
      meta: { label: String(t("forms.name")) },
    },
    {
      accessorKey: "phone",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("forms.phone"))}
        />
      ),
      meta: { label: String(t("forms.phone")) },
    },
    {
      accessorKey: "reservationsCount",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("systemPages.customersReservationsCount"))}
        />
      ),
      meta: { label: String(t("systemPages.customersReservationsCount")) },
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
  ];
}
