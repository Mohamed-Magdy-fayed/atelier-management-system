"use client";

import type { Table } from "@tanstack/react-table";

import { dressCurrentStatusValues } from "@/drizzle/schemas/system/dresses-table";
import {
  DataTableDateRangeFilter,
  DataTableFacetedFilter,
  DataTableNumberRangeFilter,
} from "@/features/core/data-table";
import { useTranslation } from "@/features/core/i18n/client";
import type { GridFacetCounts } from "@/features/system/shared/facets";
import type { DressGridRow } from "@/integrations/trpc/routers/dresses";

function dressCurrentStatusTranslationId(status: string) {
  switch (status) {
    case "atTailor":
      return "systemPages.dressCurrentStatusAtTailor" as const;
    case "atDryCleaner":
      return "systemPages.dressCurrentStatusAtDryCleaner" as const;
    case "underRepair":
      return "systemPages.dressCurrentStatusUnderRepair" as const;
    default:
      return "systemPages.dressCurrentStatusAvailable" as const;
  }
}

export function DressesGridFilters({
  table,
  facets,
}: {
  table: Table<DressGridRow>;
  facets?: GridFacetCounts;
}) {
  const { t } = useTranslation();
  const statusColumn = table.getColumn("isActive");
  const currentStatusColumn = table.getColumn("currentStatus");
  const priceColumn = table.getColumn("pricePerDay");
  const createdAtColumn = table.getColumn("createdAt");

  const statusOptions = [
    { label: String(t("common.active")), value: "true" },
    { label: String(t("common.inactive")), value: "false" },
  ];

  const currentStatusOptions = dressCurrentStatusValues.map((value) => ({
    value,
    label: String(t(dressCurrentStatusTranslationId(value))),
  }));

  return (
    <>
      {statusColumn ? (
        <DataTableFacetedFilter
          column={statusColumn}
          title={String(t("systemPages.dressesStatus"))}
          options={statusOptions}
          counts={facets?.isActive}
        />
      ) : null}
      {currentStatusColumn ? (
        <DataTableFacetedFilter
          column={currentStatusColumn}
          title={String(t("systemPages.dressCurrentStatus"))}
          options={currentStatusOptions}
          counts={facets?.currentStatus}
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
