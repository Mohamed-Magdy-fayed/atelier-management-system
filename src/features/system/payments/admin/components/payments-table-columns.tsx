"use client";

import type { ColumnDef } from "@tanstack/react-table";

import { DataTableColumnHeader } from "@/features/core/data-table";
import type { useTranslation } from "@/features/core/i18n/client";
import type { PaymentGridRow } from "@/integrations/trpc/routers/payments";

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
  t: Translate;
}): ColumnDef<PaymentGridRow>[] {
  const { locale, t } = opts;
  const dateFmt = new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const moneyFmt = new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-EG", {
    maximumFractionDigits: 0,
  });

  return [
    {
      accessorKey: "amount",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("systemPages.paymentsAmount"))}
        />
      ),
      meta: { label: String(t("systemPages.paymentsAmount")) },
      cell: ({ row }) => moneyFmt.format(row.original.amount),
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
      cell: ({ row }) => String(t(paymentTypeTranslationId(row.original.type))),
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
      cell: ({ row }) =>
        String(t(paymentMethodTranslationId(row.original.method))),
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
