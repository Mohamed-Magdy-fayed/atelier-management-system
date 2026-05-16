"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import type { ReservationsReceiptProps } from "../../lib/receipt/types";
import { ReceiptBody, receiptFontClass } from "./reservation-receipt-sections";
import { useReservationReceipt } from "./use-reservation-receipt";

function PrintableReceipt({
  hook,
}: {
  hook: ReturnType<typeof useReservationReceipt>;
}) {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed start-0 top-0 -z-50 w-[80mm] overflow-hidden opacity-0"
    >
      <div id="reservation-receipt-print-root" ref={hook.printContainerRef}>
        <ReceiptBody
          data={{
            customer: hook.customer,
            totals: hook.totals,
            dress: hook.dress,
            dates: hook.dates,
            paymentMethod: hook.paymentMethod,
            status: hook.status,
            notes: hook.notes,
            usagePolicyHint: hook.usagePolicyHint,
            reservationCode: hook.reservationCode,
            branchName: hook.branchName,
          }}
          variant="print"
        />
      </div>
    </div>
  );
}

export function ReservationsReceipt(props: ReservationsReceiptProps) {
  const hook = useReservationReceipt(props);
  const { labels, handlePrint, openFullView, isDialogOpen, setIsDialogOpen } =
    hook;

  return (
    <>
      <div
        className={cn(
          "space-y-3 rounded-xl border border-border/70 bg-muted/40 p-4",
          receiptFontClass,
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h4 className="font-semibold text-foreground text-sm leading-tight">
            {labels.cardTitle}
            {props.reservationCode ? (
              <span className="text-muted-foreground">
                {" "}
                · {props.reservationCode}
              </span>
            ) : null}
          </h4>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => handlePrint()}
              size="sm"
              type="button"
              variant="outline"
            >
              {labels.printLabel}
            </Button>
            <Button onClick={openFullView} size="sm" type="button">
              {labels.expandLabel}
            </Button>
          </div>
        </div>
      </div>

      <PrintableReceipt hook={hook} />

      <Dialog onOpenChange={setIsDialogOpen} open={isDialogOpen}>
        <DialogContent className="max-h-[min(90vh,720px)] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{labels.fullTitle}</DialogTitle>
          </DialogHeader>
          <ReceiptBody data={props} variant="full" />
          <DialogFooter>
            <Button
              onClick={() => setIsDialogOpen(false)}
              type="button"
              variant="outline"
            >
              {labels.close}
            </Button>
            <Button onClick={() => handlePrint()} type="button">
              {labels.printLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
