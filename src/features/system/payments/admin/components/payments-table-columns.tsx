"use client";

import type { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import type {
  PaymentMethod,
  PaymentType,
} from "@/drizzle/schemas/system/payments-table";
import {
  createEntityActionsColumn,
  createSelectColumn,
  DataTableColumnHeader,
} from "@/features/core/data-table";
import type { useTranslation } from "@/features/core/i18n/client";
import { DressViewDialog } from "@/features/system/dresses/admin/components/dress-view-dialog";
import {
  getPaymentMethodVariant,
  getPaymentTypeVariant,
} from "@/features/system/payments/utils";
import type { PaymentGridRow } from "@/integrations/trpc/routers/payments";
import { formatCurrency } from "@/lib/format";

import {
  PaymentRowActions,
  type SetPaymentRowAction,
} from "./payment-row-actions";

type Translate = ReturnType<typeof useTranslation>["t"];

function paymentTypeTranslationId(type: string) {
  switch (type) {
    case "deposit":
      return "systemPages.paymentTypeDeposit" as const;
    case "finalPayment":
      return "systemPages.paymentTypeFinalPayment" as const;
    case "penalty":
      return "systemPages.paymentTypePenalty" as const;
    case "insurance":
      return "systemPages.paymentTypeInsurance" as const;
    default:
      return "systemPages.paymentsType";
  }
}

function paymentMethodTranslationId(method: string) {
  switch (method) {
    case "instapay":
      return "systemPages.paymentMethodInstapay" as const;
    case "mobileWallet":
      return "systemPages.paymentMethodMobileWallet" as const;
    case "visa":
      return "systemPages.paymentMethodVisa" as const;
    case "cash":
      return "systemPages.paymentMethodCash" as const;
    default:
      return "systemPages.paymentsMethod";
  }
}

export function buildPaymentColumns(opts: {
  locale: string;
  setRowAction: SetPaymentRowAction;
  t: Translate;
}): ColumnDef<PaymentGridRow>[] {
  const { locale, setRowAction, t } = opts;
  const dateFmt = new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const currencyLocale = locale === "ar" ? "ar-EG" : "en-EG";
  const fmt = (n: number) => formatCurrency(n, currencyLocale);

  return [
    createSelectColumn<PaymentGridRow>(),
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
      meta: { label: String(t("systemPages.reservationsCustomerPhone")) },
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
      accessorKey: "amount",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("systemPages.paymentsAmount"))}
        />
      ),
      meta: { label: String(t("systemPages.paymentsAmount")) },
      cell: ({ row }) => (
        <span className="font-medium text-primary">
          {fmt(row.original.amount)}
        </span>
      ),
    },
    {
      accessorKey: "type",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("systemPages.paymentsType"))}
        />
      ),
      meta: { label: String(t("systemPages.paymentsType")) },
      cell: ({ row }) => (
        <Badge
          variant={getPaymentTypeVariant(row.original.type as PaymentType)}
        >
          {String(t(paymentTypeTranslationId(row.original.type)))}
        </Badge>
      ),
    },
    {
      accessorKey: "method",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("systemPages.paymentsMethod"))}
        />
      ),
      meta: { label: String(t("systemPages.paymentsMethod")) },
      cell: ({ row }) => (
        <Badge
          variant={getPaymentMethodVariant(
            row.original.method as PaymentMethod,
          )}
        >
          {String(t(paymentMethodTranslationId(row.original.method)))}
        </Badge>
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
    createEntityActionsColumn({
      t,
      size: 48,
      cell: ({ row }) => (
        <PaymentRowActions row={row.original} setRowAction={setRowAction} />
      ),
    }),
  ];
}
