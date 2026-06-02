"use client";

import type { Table } from "@tanstack/react-table";

import {
  DataTableDateRangeFilter,
  DataTableFacetedFilter,
  DataTableNumberRangeFilter,
} from "@/features/core/data-table";
import { useTranslation } from "@/features/core/i18n/client";
import type { DressGridRow } from "@/integrations/trpc/routers/dresses";

export function DressesGridFilters({ table }: { table: Table<DressGridRow> }) {
  const { t } = useTranslation();
  const statusColumn = table.getColumn("isActive");
  const priceColumn = table.getColumn("pricePerDay");
  const createdAtColumn = table.getColumn("createdAt");

  const statusOptions = [
    { label: String(t("common.active")), value: "true" },
    { label: String(t("common.inactive")), value: "false" },
  ];

  return (
    <>
      {statusColumn ? (
        <DataTableFacetedFilter
          column={statusColumn}
          title={String(t("systemPages.dressesStatus"))}
          options={statusOptions}
        />
      ) : null}
      {priceColumn ? (
        <DataTableNumberRangeFilter
          column={priceColumn}
          title={String(t("systemPages.dressesPricePerDay"))}
        />
      ) : null}
      {createdAtColumn ? (
        <DataTableDateRangeFilter
          column={createdAtColumn}
          title={String(t("common.createdAt"))}
        />
      ) : null}
    </>
  );
}
