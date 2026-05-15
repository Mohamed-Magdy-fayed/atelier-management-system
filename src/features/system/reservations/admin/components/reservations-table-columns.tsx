"use client";

import type { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import type { ReservationStatus } from "@/drizzle/schemas/system/reservations-table";
import {
  createSelectColumn,
  DataTableColumnHeader,
} from "@/features/core/data-table";
import type { useTranslation } from "@/features/core/i18n/client";
import { DressViewDialog } from "@/features/system/dresses/admin/components/dress-view-dialog";
import { getStatusVariant } from "@/features/system/reservations/utils";
import type { ReservationGridRow } from "@/integrations/trpc/routers/reservations";
import { formatCurrency } from "@/lib/format";

import { ReservationRowActions } from "./reservation-row-actions";

type Translate = ReturnType<typeof useTranslation>["t"];

function statusLabelKey(status: ReservationStatus) {
  switch (status) {
    case "reserved":
      return "systemPages.reservationStatusReserved";
    case "pickedUp":
      return "systemPages.reservationStatusPickedUp";
    case "returned":
      return "systemPages.reservationStatusReturned";
    case "cancelled":
      return "systemPages.reservationStatusCancelled";
  }
}

export function buildReservationColumns(opts: {
  locale: string;
  t: Translate;
}): ColumnDef<ReservationGridRow>[] {
  const { locale, t } = opts;
  const currencyLocale = locale === "ar" ? "ar-EG" : "en-EG";
  const fmt = (n: number) => formatCurrency(n, currencyLocale);

  const dateTimeFmt = new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const dateFmt = new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", {
    dateStyle: "medium",
  });

  const formatDt = (value: Date) => dateTimeFmt.format(new Date(value));
  const formatDay = (value: Date) => dateFmt.format(new Date(value));

  return [
    createSelectColumn<ReservationGridRow>(),
    {
      accessorKey: "reservationCode",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("systemPages.reservationsCode"))}
        />
      ),
      meta: { label: String(t("systemPages.reservationsCode")) },
    },
    {
      accessorKey: "customerName",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("systemPages.reservationsCustomerName"))}
        />
      ),
      meta: { label: String(t("systemPages.reservationsCustomerName")) },
    },
    {
      accessorKey: "customerPhone",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("systemPages.reservationsCustomerPhone"))}
        />
      ),
      cell: ({ row }) => row.original.customerPhone ?? "—",
      meta: { label: String(t("systemPages.reservationsCustomerPhone")) },
    },
    {
      accessorKey: "totalPrice",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("systemPages.reservationsTotalDue"))}
        />
      ),
      cell: ({ row }) => fmt(row.original.totalPrice),
      meta: { label: String(t("systemPages.reservationsTotalDue")) },
    },
    {
      accessorKey: "insurance",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("systemPages.reservationsInsurance"))}
        />
      ),
      cell: ({ row }) => fmt(row.original.insurance),
      meta: { label: String(t("systemPages.reservationsInsurance")) },
    },
    {
      accessorKey: "discount",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("systemPages.reservationsDiscount"))}
        />
      ),
      cell: ({ row }) =>
        row.original.discount > 0 ? (
          <span className="text-destructive">
            -{fmt(row.original.discount)}
          </span>
        ) : (
          "—"
        ),
      meta: { label: String(t("systemPages.reservationsDiscount")) },
    },
    {
      accessorKey: "depositPaid",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("systemPages.reservationsDepositPaid"))}
        />
      ),
      cell: ({ row }) => fmt(row.original.depositPaid),
      meta: { label: String(t("systemPages.reservationsDepositPaid")) },
    },
    {
      accessorKey: "totalPaid",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("systemPages.reservationsTotalPaid"))}
        />
      ),
      cell: ({ row }) => fmt(row.original.totalPaid),
      meta: { label: String(t("systemPages.reservationsTotalPaid")) },
    },
    {
      accessorKey: "remainingBalance",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("systemPages.reservationsRemaining"))}
        />
      ),
      cell: ({ row }) => fmt(row.original.remainingBalance),
      meta: { label: String(t("systemPages.reservationsRemaining")) },
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("systemPages.reservationsStatus"))}
        />
      ),
      cell: ({ row }) => (
        <Badge variant={getStatusVariant(row.original.status)}>
          {String(t(statusLabelKey(row.original.status)))}
        </Badge>
      ),
      meta: { label: String(t("systemPages.reservationsStatus")) },
    },
    {
      accessorKey: "dressId",
      header: () => null,
      cell: () => null,
      enableSorting: false,
      enableHiding: true,
      size: 0,
      maxSize: 0,
      meta: { label: String(t("systemPages.reservationsDress")) },
    },
    {
      id: "dress",
      accessorKey: "dressTitle",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("systemPages.reservationsDress"))}
        />
      ),
      cell: ({ row }) => (
        <DressViewDialog
          dressId={row.original.dressId}
          dressLabel={row.original.dressTitle}
        />
      ),
      meta: { label: String(t("systemPages.reservationsDress")) },
    },
    {
      accessorKey: "receivingDateTime",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("systemPages.reservationsReceiving"))}
        />
      ),
      cell: ({ row }) => formatDt(row.original.receivingDateTime),
      meta: { label: String(t("systemPages.reservationsReceiving")) },
    },
    {
      accessorKey: "occasionDate",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("systemPages.reservationsOccasion"))}
        />
      ),
      cell: ({ row }) => formatDay(row.original.occasionDate),
      meta: { label: String(t("systemPages.reservationsOccasion")) },
    },
    {
      accessorKey: "returnDateTime",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("systemPages.reservationsReturn"))}
        />
      ),
      cell: ({ row }) => formatDt(row.original.returnDateTime),
      meta: { label: String(t("systemPages.reservationsReturn")) },
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("common.createdAt"))}
        />
      ),
      cell: ({ row }) => formatDt(row.original.createdAt),
      meta: { label: String(t("common.createdAt")) },
    },
    {
      id: "actions",
      cell: ({ row }) => <ReservationRowActions row={row.original} />,
    },
  ];
}
