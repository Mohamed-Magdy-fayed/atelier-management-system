"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpRightIcon,
  DollarSignIcon,
  Edit2Icon,
  InfoIcon,
  MoreHorizontalIcon,
  ReceiptTextIcon,
  Trash2Icon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ReservationStatus } from "@/drizzle/schemas/system/reservations-table";
import { reservationStatuses } from "@/drizzle/schemas/system/reservations-table";
import { useTranslation } from "@/features/core/i18n/client";
import { useTRPC } from "@/integrations/trpc/client";
import type { ReservationGridRow } from "@/integrations/trpc/routers/reservations";

import { ReservationDeleteDialog } from "./reservation-delete-dialog";
import { ReservationFormDialog } from "./reservation-form-dialog";
import { ReservationInfoModal } from "./reservation-info-modal";
import { ReservationPaymentDialog } from "./reservation-payment-dialog";
import { ReservationReceiptDialog } from "./reservation-receipt-dialog";

type ReservationRowActionsProps = {
  row: ReservationGridRow;
};

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

export function ReservationRowActions({ row }: ReservationRowActionsProps) {
  const { t } = useTranslation();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [infoOpen, setInfoOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const updateStatusMut = useMutation(
    trpc.reservations.updateStatus.mutationOptions(),
  );

  const collectDisabled =
    row.totalPrice <= (row.depositPaid || 0) + (row.discount || 0);

  async function handleStatusChange(status: ReservationStatus) {
    try {
      await toast
        .promise(updateStatusMut.mutateAsync({ id: row.id, status }), {
          loading: String(t("common.saving")),
          success: String(t("systemPages.reservationUpdated")),
          error: (err) =>
            err instanceof Error
              ? err.message
              : String(t("systemPages.reservationSaveFailed")),
        })
        .unwrap();

      await queryClient.invalidateQueries({
        queryKey: trpc.reservations.pathKey(),
      });
    } catch {
      // surfaced by toast
    }
  }

  return (
    <>
      <ReservationInfoModal
        open={infoOpen}
        onOpenChange={setInfoOpen}
        reservation={row}
      />
      <ReservationReceiptDialog
        open={receiptOpen}
        onOpenChange={setReceiptOpen}
        reservation={row}
      />
      <ReservationFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        reservation={row}
      />
      <ReservationPaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        reservation={row}
      />
      <ReservationDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        reservation={row}
        onDeleted={() => setDeleteOpen(false)}
      />

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              className="size-8"
              aria-label={String(t("common.openMenu"))}
            >
              <MoreHorizontalIcon className="size-3.5" />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuGroup>
            <DropdownMenuLabel>{String(t("common.actions"))}</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => setInfoOpen(true)}>
              <InfoIcon className="size-3.5" />
              {String(t("common.info"))}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setReceiptOpen(true)}>
              <ReceiptTextIcon className="size-3.5" />
              {String(t("systemPages.reservationsReservationReceipt"))}
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={row.status !== "reserved"}
              onClick={() => setEditOpen(true)}
            >
              <Edit2Icon className="size-3.5" />
              {String(t("common.edit"))}
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <ArrowUpRightIcon className="size-3.5" />
                {String(t("systemPages.reservationsUpdatedStatus"))}
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  {reservationStatuses.map((status) => (
                    <DropdownMenuItem
                      key={status}
                      onClick={() => void handleStatusChange(status)}
                    >
                      {String(t(statusLabelKey(status)))}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
            <DropdownMenuItem
              disabled={collectDisabled}
              onClick={() => setPaymentOpen(true)}
            >
              <DollarSignIcon className="size-3.5" />
              {String(t("systemPages.reservationsCollectPayment"))}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setDeleteOpen(true)}>
              <Trash2Icon className="size-3.5 text-destructive" />
              <span className="text-destructive">
                {String(t("common.delete"))}
              </span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

export type ReservationRowActionVariant = never;
export type SetReservationRowAction = never;
