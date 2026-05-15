"use client";

import { useQuery } from "@tanstack/react-query";
import type { Table } from "@tanstack/react-table";

import { reservationStatuses } from "@/drizzle/schemas/system/reservations-table";
import { useBranch } from "@/features/core/auth/nextjs/components/branch-provider";
import {
  DataTableDateRangeFilter,
  DataTableFacetedFilter,
} from "@/features/core/data-table";
import { useTranslation } from "@/features/core/i18n/client";
import { useTRPC } from "@/integrations/trpc/client";
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
}: {
  table: Table<ReservationGridRow>;
}) {
  const { t } = useTranslation();
  const trpc = useTRPC();
  const branchState = useBranch();
  const branchId = branchState?.hasActiveOrg
    ? branchState.activeBranch.id
    : undefined;

  const { data: formData } = useQuery({
    ...trpc.reservations.formData.queryOptions({
      branchId: branchId ?? "",
    }),
    enabled: Boolean(branchId),
  });

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

  const dressOptions =
    formData?.dresses.map((dress) => ({
      value: dress.id,
      label: `${dress.title} (${dress.code})`,
    })) ?? [];

  return (
    <>
      {statusColumn ? (
        <DataTableFacetedFilter
          column={statusColumn}
          title={String(t("systemPages.reservationsStatus"))}
          options={statusOptions}
        />
      ) : null}
      {dressColumn && dressOptions.length > 0 ? (
        <DataTableFacetedFilter
          column={dressColumn}
          title={String(t("systemPages.reservationsDress"))}
          options={dressOptions}
        />
      ) : null}
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
