"use client";

import type { Table } from "@tanstack/react-table";

import { reservationStatuses } from "@/drizzle/schemas/system/reservations-table";
import {
  DataTableDateRangeFilter,
  DataTableFacetedFilter,
} from "@/features/core/data-table";
import { useTranslation } from "@/features/core/i18n/client";
import { DressFacetFilter } from "@/features/system/dresses/admin/components/dress-facet-filter";
import type { GridFacetCounts } from "@/features/system/shared/facets";
import type { ReservationGridRow } from "@/integrations/trpc/routers/reservations";

function statusTranslationId(status: string) {
  switch (status) {
    case "reserved":
      return "systemPages.reservationStatusReserved" as const;
    case "pickedUp":
      return "systemPages.reservationStatusPickedUp" as const;
    case "returned":
      return "systemPages.reservationStatusReturned" as const;
    case "cancelled":
      return "systemPages.reservationStatusCancelled" as const;
    default:
      return "systemPages.reservationsStatus";
  }
}

export function ReservationsGridFilters({
  table,
  facets,
}: {
  table: Table<ReservationGridRow>;
  facets?: GridFacetCounts;
}) {
  const { t } = useTranslation();

  const statusColumn = table.getColumn("status");
  const dressColumn = table.getColumn("dressId");
  const receivingColumn = table.getColumn("receivingDateTime");
  const occasionColumn = table.getColumn("occasionDate");
  const returnColumn = table.getColumn("returnDateTime");
  const createdAtColumn = table.getColumn("createdAt");

  const statusOptions = reservationStatuses.map((value) => ({
    value,
    label: String(t(statusTranslationId(value))),
  }));

  return (
    <>
      {statusColumn ? (
        <DataTableFacetedFilter
          column={statusColumn}
          title={String(t("systemPages.reservationsStatus"))}
          options={statusOptions}
          counts={facets?.status}
        />
      ) : null}
      <DressFacetFilter column={dressColumn} counts={facets?.dressId} />
      {receivingColumn ? (
        <DataTableDateRangeFilter
          column={receivingColumn}
          title={String(t("systemPages.reservationsReceiving"))}
        />
      ) : null}
      {occasionColumn ? (
        <DataTableDateRangeFilter
          column={occasionColumn}
          title={String(t("systemPages.reservationsOccasion"))}
        />
      ) : null}
      {returnColumn ? (
        <DataTableDateRangeFilter
          column={returnColumn}
          title={String(t("systemPages.reservationsReturn"))}
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
