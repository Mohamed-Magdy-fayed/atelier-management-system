"use client";

import type { Table } from "@tanstack/react-table";

import { DataTableDateRangeFilter } from "@/features/core/data-table";
import { useTranslation } from "@/features/core/i18n/client";
import type { RentalCustomerGridRow } from "@/integrations/trpc/routers/rental-customers";

export function RentalCustomersGridFilters({
  table,
}: {
  table: Table<RentalCustomerGridRow>;
}) {
  const { t } = useTranslation();
  const createdAtColumn = table.getColumn("createdAt");

  return createdAtColumn ? (
    <DataTableDateRangeFilter
      column={createdAtColumn}
      title={String(t("common.createdAt"))}
    />
  ) : null;
}
