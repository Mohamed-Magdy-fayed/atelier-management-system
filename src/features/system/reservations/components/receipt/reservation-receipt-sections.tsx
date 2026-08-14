"use client";

import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { useBranch } from "@/features/core/auth/nextjs/components/branch-provider";
import { useTranslation } from "@/features/core/i18n/client";
import { useBrandName } from "@/features/system/settings/client/branding-provider";
import { getStatusVariant } from "@/features/system/reservations/utils";
import { useTRPC } from "@/integrations/trpc/client";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

import { DressReceiptQr } from "./dress-receipt-qr";
import type { ReceiptVariant, ReservationsReceiptProps } from "../../lib/receipt/types";

export const receiptFontClass =
  "font-[family:'Times_New_Roman',_Arial,_sans-serif]";
const headingClass =
  "text-lg font-semibold uppercase tracking-wide text-black";
const labelClass = "text-base font-medium uppercase text-black";
const bodyTextClass = "text-base leading-6 text-black";

type SectionProps = {
  data: ReservationsReceiptProps;
  variant?: ReceiptVariant;
  formatDateLabel?: (value?: Date | string | null, withTime?: boolean) => string;
  policyText?: string | null;
  branchName?: string;
};

export function ReceiptBrand({ data, branchName }: SectionProps) {
  const { t } = useTranslation();
  const brandName = useBrandName();

  return (
    <section
      className={cn(
        "receipt-section grid place-content-center gap-4 text-center",
        receiptFontClass,
      )}
    >
      <div className="grid gap-1">
        <span className="font-semibold text-base text-black">{brandName}</span>
        {branchName ? (
          <span className={cn(bodyTextClass, "text-center")}>
            {String(
              t("systemPages.reservationsReceiptBranch", { name: branchName }),
            )}
          </span>
        ) : null}
      </div>
      {data.dress?.id ? (
        <div className="mt-2 place-self-center justify-self-center p-2">
          <DressReceiptQr dressId={data.dress.id} />
        </div>
      ) : null}
    </section>
  );
}

export function ReceiptCustomer({ data, t }: SectionProps & { t: ReturnType<typeof useTranslation>["t"] }) {
  return (
    <section className={cn("receipt-section space-y-2", receiptFontClass)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-2">
          <h5 className={headingClass}>
            {String(t("systemPages.reservationsCustomer"))}
          </h5>
          <p className="font-semibold text-base text-black">
            {data.customer.name || "—"}
          </p>
          <p className={bodyTextClass}>
            {String(t("systemPages.reservationsCustomerPhone"))}:{" "}
            {data.customer.phone || "—"}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {data.reservationCode ? (
            <Badge className="bg-stone-100 text-black" variant="outline">
              #{data.reservationCode}
            </Badge>
          ) : null}
          {data.status ? (
            <Badge
              className="bg-stone-100 text-black"
              variant={getStatusVariant(data.status)}
            >
              {String(t(statusLabelKey(data.status)))}
            </Badge>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function statusLabelKey(status: NonNullable<ReservationsReceiptProps["status"]>) {
  switch (status) {
    case "reserved":
      return "systemPages.reservationStatusReserved" as const;
    case "pickedUp":
      return "systemPages.reservationStatusPickedUp" as const;
    case "returned":
      return "systemPages.reservationStatusReturned" as const;
    case "cancelled":
      return "systemPages.reservationStatusCancelled" as const;
  }
}

export function ReceiptDressAndNotes({ data, t }: SectionProps & { t: ReturnType<typeof useTranslation>["t"] }) {
  return (
    <div className={cn("grid gap-4", receiptFontClass)}>
      {data.dress ? (
        <section className="receipt-section space-y-3">
          <h5 className={headingClass}>
            {String(t("systemPages.reservationsDress"))}
          </h5>
          <div className="grid gap-2">
            <span className="text-base text-black">
              <strong className="font-semibold text-black">
                {data.dress.title || "—"}
              </strong>
              {data.dress.code ? (
                <span className="ml-2 text-base uppercase tracking-wide">
                  #{data.dress.code}
                </span>
              ) : null}
            </span>
            {data.dress.size ? (
              <span className={bodyTextClass}>
                {String(t("systemPages.dressesSize"))}: {data.dress.size}
              </span>
            ) : null}
            {data.dress.color ? (
              <span className={bodyTextClass}>
                {String(t("systemPages.dressesColor"))}: {data.dress.color}
              </span>
            ) : null}
          </div>
        </section>
      ) : null}
      {data.notes?.trim() ? (
        <section className="receipt-section space-y-3">
          <h5 className={headingClass}>
            {String(t("systemPages.reservationsNotes"))}
          </h5>
          <p className={cn(bodyTextClass, "whitespace-pre-wrap")}>
            {data.notes.trim()}
          </p>
        </section>
      ) : null}
    </div>
  );
}

export function ReceiptTotals({
  data,
  t,
  locale,
}: SectionProps & {
  t: ReturnType<typeof useTranslation>["t"];
  locale: string;
}) {
  const currencyLocale = locale === "ar" ? "ar-EG" : "en-EG";
  const fmt = (n: number) => formatCurrency(n, currencyLocale);

  return (
    <section className={cn("receipt-section space-y-3", receiptFontClass)}>
      <h5 className={headingClass}>
        {String(t("systemPages.reservationsReceiptTotals"))}
      </h5>
      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className={labelClass}>
            {String(t("systemPages.reservationsTotalDue"))}
          </span>
          <span className="font-semibold text-base text-black">
            {fmt(data.totals.totalDue)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className={labelClass}>
            {String(t("systemPages.reservationsDepositPaid"))}
          </span>
          <span className="text-base text-black">
            {fmt(data.totals.depositPaid)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className={labelClass}>
            {String(t("systemPages.reservationsDiscount"))}
          </span>
          <span className="text-base text-black">
            -{fmt(data.totals.discount)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className={labelClass}>
            {String(t("systemPages.reservationsRemaining"))}
          </span>
          <span className="font-semibold text-base text-primary">
            {fmt(data.totals.outstanding)}
          </span>
        </div>
      </div>
    </section>
  );
}

export function ReceiptDates({
  data,
  t,
  formatDateLabel = () => "",
}: SectionProps & { t: ReturnType<typeof useTranslation>["t"] }) {
  return (
    <section className={cn("receipt-section space-y-3", receiptFontClass)}>
      <h5 className={headingClass}>
        {String(t("systemPages.reservationsReceiptDates"))}
      </h5>
      <div className="grid gap-2">
        <span className={bodyTextClass}>
          {String(t("systemPages.reservationsReceiving"))}:{" "}
          <span className="font-semibold text-base text-black">
            {formatDateLabel(data.dates.receiving, true)}
          </span>
        </span>
        <span className={bodyTextClass}>
          {String(t("systemPages.reservationsOccasion"))}:{" "}
          <span className="font-semibold text-base text-black">
            {formatDateLabel(data.dates.occasion, false)}
          </span>
        </span>
        <span className={bodyTextClass}>
          {String(t("systemPages.reservationsReturn"))}:{" "}
          <span className="font-semibold text-base text-black">
            {formatDateLabel(data.dates.returning, true)}
          </span>
        </span>
      </div>
    </section>
  );
}

export function ReceiptPolicy({
  data,
  t,
}: SectionProps & { t: ReturnType<typeof useTranslation>["t"] }) {
  const trpc = useTRPC();
  const { data: settingsPage, isFetching } = useQuery({
    ...trpc.settings.list.queryOptions({
      page: 1,
      perPage: 100,
      sorting: [],
    }),
    enabled: !data.usagePolicyHint?.trim(),
  });

  const loadedPolicy =
    settingsPage?.rows.find((row) => row.code === "00003" && row.isActive !== false)
      ?.value ?? "";

  const text =
    data.usagePolicyHint?.trim() ||
    loadedPolicy.trim() ||
    String(t("systemPages.reservationsReceiptDefaultPolicy"));

  return (
    <section className={cn("receipt-section space-y-3", receiptFontClass)}>
      <h5 className={headingClass}>
        {String(t("systemPages.reservationsReceiptUsagePolicy"))}
      </h5>
      <p
        className={cn(
          bodyTextClass,
          "whitespace-pre-wrap text-black",
          isFetching && "opacity-60",
        )}
      >
        {text}
      </p>
    </section>
  );
}

export function ReceiptFooter({
  data,
  t,
  locale,
  variant,
}: SectionProps & {
  t: ReturnType<typeof useTranslation>["t"];
  locale: string;
  variant?: ReceiptVariant;
}) {
  const currencyLocale = locale === "ar" ? "ar-EG" : "en-EG";
  const fmt = (n: number) => formatCurrency(n, currencyLocale);

  const methodLabel = data.paymentMethod
    ? String(t(paymentMethodKey(data.paymentMethod)))
    : "—";

  if (variant === "print") {
    return (
      <div className={cn("receipt-section space-y-2", receiptFontClass)}>
        <div className="flex items-center justify-between gap-2">
          <span className={cn(bodyTextClass, "text-black")}>
            {String(t("systemPages.reservationsReceiptOutstandingLabel"))}
          </span>
          <strong className="font-black text-base text-black">
            {fmt(data.totals.outstanding)}
          </strong>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className={cn(bodyTextClass, "text-black")}>
            {String(t("systemPages.reservationsPaymentMethod"))}
          </span>
          <strong className="font-semibold text-base text-black">
            {methodLabel}
          </strong>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className={cn(bodyTextClass, "text-black")}>
            {String(t("systemPages.reservationsInsurance"))}
          </span>
          <strong className="font-black text-base text-black">
            {fmt(data.totals.insurance)}
          </strong>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "receipt-section flex flex-wrap items-center gap-3",
        receiptFontClass,
      )}
    >
      <span className="text-base text-black">
        {String(t("systemPages.reservationsReceiptOutstandingLabel"))}{" "}
        <strong className="font-black text-base text-black">
          {fmt(data.totals.outstanding)}
        </strong>
      </span>
      <span className="text-base text-muted-foreground">|</span>
      <span className="text-base text-black">
        {String(t("systemPages.reservationsPaymentMethod"))}:{" "}
        <strong className="font-semibold text-base text-black">
          {methodLabel}
        </strong>
      </span>
      <span className="text-base text-muted-foreground">|</span>
      <span className="text-base text-black">
        {String(t("systemPages.reservationsInsurance"))}{" "}
        <strong className="font-black text-base text-black">
          {fmt(data.totals.insurance)}
        </strong>
      </span>
    </div>
  );
}

function paymentMethodKey(method: NonNullable<ReservationsReceiptProps["paymentMethod"]>) {
  switch (method) {
    case "cash":
      return "systemPages.paymentMethodCash" as const;
    case "instapay":
      return "systemPages.paymentMethodInstapay" as const;
    case "mobileWallet":
      return "systemPages.paymentMethodMobileWallet" as const;
    case "visa":
      return "systemPages.paymentMethodVisa" as const;
  }
}

export function ReceiptBody({
  data,
  variant = "full",
}: {
  data: ReservationsReceiptProps;
  variant?: ReceiptVariant;
}) {
  const { t, locale } = useTranslation();
  const branchState = useBranch();
  const branchName =
    data.branchName ??
    (branchState?.hasActiveOrg
      ? locale === "ar"
        ? branchState.activeBranch.nameAr
        : branchState.activeBranch.nameEn
      : "");

  const formatDateLabel = (
    value?: Date | string | null,
    withTime = true,
  ) => {
    if (!value) return String(t("common.inactive"));
    const date = new Date(value);
    return new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", {
      month: "short",
      day: "numeric",
      year: "numeric",
      ...(withTime
        ? { hour: "numeric", minute: "2-digit" as const }
        : {}),
    }).format(date);
  };

  const section = { data, variant, formatDateLabel, branchName };

  if (variant === "print") {
    return (
      <div className={cn("receipt-print p-2", receiptFontClass)}>
        <ReceiptBrand {...section} />
        <ReceiptCustomer {...section} t={t} />
        <ReceiptDressAndNotes {...section} t={t} />
        <ReceiptTotals {...section} locale={locale} t={t} />
        <ReceiptDates {...section} t={t} />
        <ReceiptPolicy {...section} t={t} />
        <ReceiptFooter {...section} locale={locale} t={t} variant="print" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-6 bg-white p-4",
        receiptFontClass,
        "text-base leading-6",
      )}
    >
      <ReceiptBrand {...section} />
      <ReceiptCustomer {...section} t={t} />
      <ReceiptDressAndNotes {...section} t={t} />
      <ReceiptTotals {...section} locale={locale} t={t} />
      <ReceiptDates {...section} t={t} />
      <ReceiptPolicy {...section} t={t} />
      <ReceiptFooter {...section} locale={locale} t={t} />
    </div>
  );
}
