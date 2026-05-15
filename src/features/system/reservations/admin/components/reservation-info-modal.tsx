"use client";

import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslation } from "@/features/core/i18n/client";
import { getStatusVariant } from "@/features/system/reservations/utils";
import type { ReservationGridRow } from "@/integrations/trpc/routers/reservations";
import { formatCurrency } from "@/lib/format";

type ReservationInfoModalProps = {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  reservation: ReservationGridRow | null;
};

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[9rem_1fr] items-start gap-2 py-1.5 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="break-words text-foreground">{value}</span>
    </div>
  );
}

function statusLabelKey(status: ReservationGridRow["status"]) {
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

export function ReservationInfoModal({
  onOpenChange,
  open,
  reservation,
}: ReservationInfoModalProps) {
  const { t, locale } = useTranslation();
  const currencyLocale = locale === "ar" ? "ar-EG" : "en-EG";
  const dateTimeFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [locale],
  );
  const dateFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", {
        dateStyle: "medium",
      }),
    [locale],
  );

  if (!reservation) return null;

  const dash = "—";
  const fmtMoney = (n: number) => formatCurrency(n, currencyLocale);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{reservation.reservationCode}</DialogTitle>
          <DialogDescription>
            {String(t("systemPages.reservationsInfoDescription"))}
          </DialogDescription>
        </DialogHeader>
        <div className="divide-y divide-border">
          <InfoRow
            label={String(t("systemPages.reservationsCustomerName"))}
            value={reservation.customerName}
          />
          <InfoRow
            label={String(t("systemPages.reservationsCustomerPhone"))}
            value={reservation.customerPhone ?? dash}
          />
          <InfoRow
            label={String(t("systemPages.reservationsDress"))}
            value={`${reservation.dressTitle} (${reservation.dressCode})`}
          />
          <InfoRow
            label={String(t("systemPages.reservationsStatus"))}
            value={
              <Badge variant={getStatusVariant(reservation.status)}>
                {String(t(statusLabelKey(reservation.status)))}
              </Badge>
            }
          />
          <InfoRow
            label={String(t("systemPages.reservationsReceiving"))}
            value={dateTimeFmt.format(new Date(reservation.receivingDateTime))}
          />
          <InfoRow
            label={String(t("systemPages.reservationsOccasion"))}
            value={dateFmt.format(new Date(reservation.occasionDate))}
          />
          <InfoRow
            label={String(t("systemPages.reservationsReturn"))}
            value={dateTimeFmt.format(new Date(reservation.returnDateTime))}
          />
          <InfoRow
            label={String(t("systemPages.reservationsTotalDue"))}
            value={fmtMoney(reservation.totalPrice)}
          />
          <InfoRow
            label={String(t("systemPages.reservationsInsurance"))}
            value={fmtMoney(reservation.insurance)}
          />
          <InfoRow
            label={String(t("systemPages.reservationsDiscount"))}
            value={
              reservation.discount > 0 ? (
                <span className="text-destructive">
                  -{fmtMoney(reservation.discount)}
                </span>
              ) : (
                dash
              )
            }
          />
          <InfoRow
            label={String(t("systemPages.reservationsDepositPaid"))}
            value={fmtMoney(reservation.depositPaid)}
          />
          <InfoRow
            label={String(t("systemPages.reservationsTotalPaid"))}
            value={fmtMoney(reservation.totalPaid)}
          />
          <InfoRow
            label={String(t("systemPages.reservationsRemaining"))}
            value={fmtMoney(reservation.remainingBalance)}
          />
          {reservation.notes ? (
            <InfoRow
              label={String(t("systemPages.reservationsNotes"))}
              value={reservation.notes}
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
