"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslation } from "@/features/core/i18n/client";
import { ReceiptBody } from "@/features/system/reservations/components/receipt/reservation-receipt-sections";
import { useReservationReceipt } from "@/features/system/reservations/components/receipt/use-reservation-receipt";
import { mapToReceiptProps } from "@/features/system/reservations/lib/receipt/map-receipt-props";
import type { ReservationGridRow } from "@/integrations/trpc/routers/reservations";

type ReservationReceiptDialogProps = {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  reservation: ReservationGridRow | null;
};

export function ReservationReceiptDialog({
  onOpenChange,
  open,
  reservation,
}: ReservationReceiptDialogProps) {
  const { t } = useTranslation();

  if (!reservation) return null;

  const receiptData = mapToReceiptProps({
    reservationCode: reservation.reservationCode,
    customerName: reservation.customerName,
    customerPhone: reservation.customerPhone ?? "",
    dress: {
      id: reservation.dressId,
      title: reservation.dressTitle,
      code: reservation.dressCode,
      pricePerDay: reservation.totalPrice,
      insurance: reservation.insurance,
    },
    receivingDateTime: new Date(reservation.receivingDateTime),
    occasionDate: new Date(reservation.occasionDate),
    returnDateTime: new Date(reservation.returnDateTime),
    discount: reservation.discount,
    depositPaid: reservation.depositPaid,
    notes: reservation.notes,
    status: reservation.status,
  });

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <ReceiptDialogBody
        onOpenChange={onOpenChange}
        receiptData={receiptData}
        title={String(t("systemPages.reservationsReservationReceipt"))}
      />
    </Dialog>
  );
}

function ReceiptDialogBody({
  receiptData,
  title,
  onOpenChange,
}: {
  receiptData: ReturnType<typeof mapToReceiptProps>;
  title: string;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const hook = useReservationReceipt(receiptData);

  return (
  <>
    <DialogContent className="max-h-[min(90vh,720px)] max-w-2xl gap-4 overflow-y-auto print:shadow-none">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <ReceiptBody data={receiptData} variant="full" />
      <DialogFooter>
        <Button onClick={() => onOpenChange(false)} type="button" variant="outline">
          {t("common.close")}
        </Button>
        <Button onClick={() => hook.handlePrint()} type="button">
          {String(t("systemPages.reservationsPrint"))}
        </Button>
      </DialogFooter>
    </DialogContent>
    <div
      aria-hidden
      className="pointer-events-none fixed start-0 top-0 -z-50 w-[80mm] overflow-hidden opacity-0"
    >
      <div id="reservation-receipt-print-root" ref={hook.printContainerRef}>
        <ReceiptBody data={receiptData} variant="print" />
      </div>
    </div>
  </>
  );
}
