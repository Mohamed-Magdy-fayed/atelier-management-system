"use client";

import type { Table } from "@tanstack/react-table";

import {
  paymentMethods,
  paymentTypes,
} from "@/drizzle/schemas/system/payments-table";
import {
  DataTableDateRangeFilter,
  DataTableFacetedFilter,
} from "@/features/core/data-table";
import { useTranslation } from "@/features/core/i18n/client";
import type { PaymentGridRow } from "@/integrations/trpc/routers/payments";

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

export function PaymentsGridFilters({
  table,
}: {
  table: Table<PaymentGridRow>;
}) {
  const { t } = useTranslation();
  const typeColumn = table.getColumn("type");
  const methodColumn = table.getColumn("method");
  const createdAtColumn = table.getColumn("createdAt");

  const typeOptions = paymentTypes.map((value) => ({
    value,
    label: String(t(paymentTypeTranslationId(value))),
  }));

  const methodOptions = paymentMethods.map((value) => ({
    value,
    label: String(t(paymentMethodTranslationId(value))),
  }));

  return (
    <>
      {typeColumn ? (
        <DataTableFacetedFilter
          column={typeColumn}
          title={String(t("systemPages.paymentsType"))}
          options={typeOptions}
        />
      ) : null}
      {methodColumn ? (
        <DataTableFacetedFilter
          column={methodColumn}
          title={String(t("systemPages.paymentsMethod"))}
          options={methodOptions}
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
