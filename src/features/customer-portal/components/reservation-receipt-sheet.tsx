"use client";

import {
  BuildingIcon,
  CalendarIcon,
  ReceiptTextIcon,
  TagIcon,
  UserIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Muted } from "@/components/ui/typography";

type ReceiptData = {
  reservationCode: string;
  statusLabel: string;
  customerName: string;
  customerPhone: string | null;
  dressTitle: string;
  dressCode: string;
  branchName: string;
  branchAddress: string | null;
  branchPhone: string | null;
  pickupDate: string;
  occasionDate: string;
  returnDate: string;
  totalPrice: string;
  insurance: string | null;
  discount: string | null;
  depositPaid: string | null;
  totalPaid: string;
  remaining: string | null;
  notes: string | null;
};

type Labels = {
  triggerLabel: string;
  customerSection: string;
  dressSection: string;
  branchSection: string;
  datesSection: string;
  pricingSection: string;
  pickupDateLabel: string;
  occasionDateLabel: string;
  returnDateLabel: string;
  totalRentalLabel: string;
  insuranceLabel: string;
  discountLabel: string;
  depositPaidLabel: string;
  totalPaidLabel: string;
  remainingLabel: string;
  notesLabel: string;
};

type Props = ReceiptData & Labels;

export function ReservationReceiptSheet({
  reservationCode,
  statusLabel,
  customerName,
  customerPhone,
  dressTitle,
  dressCode,
  branchName,
  branchAddress,
  branchPhone,
  pickupDate,
  occasionDate,
  returnDate,
  totalPrice,
  insurance,
  discount,
  depositPaid,
  totalPaid,
  remaining,
  notes,
  triggerLabel,
  customerSection,
  dressSection,
  branchSection,
  datesSection,
  pricingSection,
  pickupDateLabel,
  occasionDateLabel,
  returnDateLabel,
  totalRentalLabel,
  insuranceLabel,
  discountLabel,
  depositPaidLabel,
  totalPaidLabel,
  remainingLabel,
  notesLabel,
}: Props) {
  return (
    <Sheet>
      <SheetTrigger
        render={
          <button
            type="button"
            className="inline-flex h-7 shrink-0 items-center justify-center gap-1 rounded-md border border-border bg-transparent px-2 text-xs font-medium transition-colors hover:bg-input/50"
          >
            <ReceiptTextIcon className="size-3.5" />
            {triggerLabel}
          </button>
        }
      />
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader className="pb-0">
          <div className="flex flex-wrap items-center gap-2">
            <SheetTitle className="font-mono text-sm">
              {reservationCode}
            </SheetTitle>
            <Badge variant="secondary">{statusLabel}</Badge>
          </div>
        </SheetHeader>
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="space-y-5 px-6 pb-10 pt-4">
            {/* Customer */}
            <section className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <UserIcon className="size-3" />
                {customerSection}
              </div>
              <p className="text-sm font-medium">{customerName}</p>
              {customerPhone ? (
                <p className="text-sm text-muted-foreground">{customerPhone}</p>
              ) : null}
            </section>

            <Separator />

            {/* Dress */}
            <section className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <TagIcon className="size-3" />
                {dressSection}
              </div>
              <p className="text-sm font-medium">{dressTitle}</p>
              <p className="font-mono text-xs text-muted-foreground">
                {dressCode}
              </p>
            </section>

            <Separator />

            {/* Branch */}
            <section className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <BuildingIcon className="size-3" />
                {branchSection}
              </div>
              <p className="text-sm font-medium">{branchName}</p>
              {branchAddress ? (
                <p className="text-sm text-muted-foreground">{branchAddress}</p>
              ) : null}
              {branchPhone ? (
                <p className="text-sm text-muted-foreground">{branchPhone}</p>
              ) : null}
            </section>

            <Separator />

            {/* Dates */}
            <section className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <CalendarIcon className="size-3" />
                {datesSection}
              </div>
              <dl className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <Muted className="text-xs">{pickupDateLabel}</Muted>
                  <dd className="font-medium">{pickupDate}</dd>
                </div>
                <div>
                  <Muted className="text-xs">{occasionDateLabel}</Muted>
                  <dd className="font-medium">{occasionDate}</dd>
                </div>
                <div>
                  <Muted className="text-xs">{returnDateLabel}</Muted>
                  <dd className="font-medium">{returnDate}</dd>
                </div>
              </dl>
            </section>

            <Separator />

            {/* Pricing */}
            <section className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {pricingSection}
              </p>
              <dl className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <Muted>{totalRentalLabel}</Muted>
                  <span className="tabular-nums">{totalPrice}</span>
                </div>
                {insurance ? (
                  <div className="flex justify-between">
                    <Muted>{insuranceLabel}</Muted>
                    <span className="tabular-nums">{insurance}</span>
                  </div>
                ) : null}
                {discount ? (
                  <div className="flex justify-between">
                    <Muted>{discountLabel}</Muted>
                    <span className="tabular-nums text-secondary">
                      -{discount}
                    </span>
                  </div>
                ) : null}
                {depositPaid ? (
                  <div className="flex justify-between">
                    <Muted>{depositPaidLabel}</Muted>
                    <span className="tabular-nums">{depositPaid}</span>
                  </div>
                ) : null}
                <Separator />
                <div className="flex justify-between font-medium">
                  <span>{totalPaidLabel}</span>
                  <span className="tabular-nums">{totalPaid}</span>
                </div>
                {remaining ? (
                  <div className="flex justify-between font-medium text-destructive">
                    <span>{remainingLabel}</span>
                    <span className="tabular-nums">{remaining}</span>
                  </div>
                ) : null}
              </dl>
            </section>

            {notes ? (
              <>
                <Separator />
                <section className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {notesLabel}
                  </p>
                  <p className="text-sm leading-relaxed">{notes}</p>
                </section>
              </>
            ) : null}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
