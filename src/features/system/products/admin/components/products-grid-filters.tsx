"use client";

import type { Table } from "@tanstack/react-table";

import {
  DataTableDateRangeFilter,
  DataTableFacetedFilter,
  DataTableNumberRangeFilter,
} from "@/features/core/data-table";
import { useTranslation } from "@/features/core/i18n/client";
import type { ProductGridRow } from "@/integrations/trpc/routers/products";

export function ProductsGridFilters({
  table,
}: {
  table: Table<ProductGridRow>;
}) {
  const { t } = useTranslation();
  const statusColumn = table.getColumn("isActive");
  const priceColumn = table.getColumn("price");
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
          title={String(t("systemPages.productsStatus"))}
          options={statusOptions}
        />
      ) : null}
      {priceColumn ? (
        <DataTableNumberRangeFilter
          column={priceColumn}
          title={String(t("systemPages.productsPrice"))}
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
