"use client";

import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "@/features/core/i18n/client";
import type { ReservationGridRow } from "@/integrations/trpc/routers/reservations";
import { formatCurrency } from "@/lib/format";

type ReservationReceiptDialogProps = {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  reservation: ReservationGridRow | null;
};

function ReceiptLine({
  label,
  value,
  destructive,
}: {
  label: string;
  value: string;
  destructive?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={destructive ? "font-medium text-destructive" : "font-medium"}
      >
        {value}
      </span>
    </div>
  );
}

export function ReservationReceiptDialog({
  onOpenChange,
  open,
  reservation,
}: ReservationReceiptDialogProps) {
  const { t, locale } = useTranslation();
  const currencyLocale = locale === "ar" ? "ar-EG" : "en-EG";

  const dateFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [locale],
  );

  if (!reservation) return null;

  const fmt = (n: number) => formatCurrency(n, currencyLocale);

  function handlePrint() {
    window.print();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-4 sm:max-w-md print:shadow-none">
        <DialogHeader>
          <DialogTitle>
            {String(t("systemPages.reservationsReservationReceipt"))}
          </DialogTitle>
        </DialogHeader>
        <div
          className="receipt-section space-y-3 border-b border-dashed py-2"
          id="reservation-receipt"
        >
          <p className="text-center font-semibold text-lg">
            {reservation.reservationCode}
          </p>
          <ReceiptLine
            label={String(t("systemPages.reservationsCustomerName"))}
            value={reservation.customerName}
          />
          <ReceiptLine
            label={String(t("systemPages.reservationsCustomerPhone"))}
            value={reservation.customerPhone ?? "—"}
          />
          <ReceiptLine
            label={String(t("systemPages.reservationsDress"))}
            value={`${reservation.dressTitle} (${reservation.dressCode})`}
          />
          <Separator />
          <ReceiptLine
            label={String(t("systemPages.reservationsReceiving"))}
            value={dateFmt.format(new Date(reservation.receivingDateTime))}
          />
          <ReceiptLine
            label={String(t("systemPages.reservationsOccasion"))}
            value={dateFmt.format(new Date(reservation.occasionDate))}
          />
          <ReceiptLine
            label={String(t("systemPages.reservationsReturn"))}
            value={dateFmt.format(new Date(reservation.returnDateTime))}
          />
          <Separator />
          <ReceiptLine
            label={String(t("systemPages.reservationsTotalDue"))}
            value={fmt(reservation.totalPrice)}
          />
          {reservation.discount > 0 ? (
            <ReceiptLine
              label={String(t("systemPages.reservationsDiscount"))}
              value={`-${fmt(reservation.discount)}`}
              destructive
            />
          ) : null}
          <ReceiptLine
            label={String(t("systemPages.reservationsDepositPaid"))}
            value={fmt(reservation.depositPaid)}
          />
          <ReceiptLine
            label={String(t("systemPages.reservationsTotalPaid"))}
            value={fmt(reservation.totalPaid)}
          />
          <ReceiptLine
            label={String(t("systemPages.reservationsRemaining"))}
            value={fmt(reservation.remainingBalance)}
          />
          <ReceiptLine
            label={String(t("systemPages.reservationsInsurance"))}
            value={fmt(reservation.insurance)}
          />
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {t("common.close")}
          </Button>
          <Button type="button" onClick={handlePrint}>
            {String(t("systemPages.reservationsPrint"))}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
