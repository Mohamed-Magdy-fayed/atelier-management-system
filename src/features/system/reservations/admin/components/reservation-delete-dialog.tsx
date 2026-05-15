"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2Icon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslation } from "@/features/core/i18n/client";
import { useTRPC } from "@/integrations/trpc/client";
import type { ReservationGridRow } from "@/integrations/trpc/routers/reservations";

type ReservationDeleteDialogProps = {
  onDeleted: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  reservation: ReservationGridRow | null;
};

export function ReservationDeleteDialog({
  onDeleted,
  onOpenChange,
  open,
  reservation,
}: ReservationDeleteDialogProps) {
  const { t } = useTranslation();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const deleteMut = useMutation(trpc.reservations.delete.mutationOptions());

  async function handleDelete() {
    if (!reservation) return;

    try {
      await toast
        .promise(deleteMut.mutateAsync({ id: reservation.id }), {
          loading: String(t("common.deleting")),
          success: String(t("systemPages.reservationDeleted")),
          error: (err) =>
            err instanceof Error
              ? err.message
              : String(t("systemPages.reservationDeleteFailed")),
        })
        .unwrap();

      await queryClient.invalidateQueries({
        queryKey: trpc.reservations.pathKey(),
      });
      onDeleted();
      onOpenChange(false);
    } catch {
      // toast.promise already surfaced the failure.
    }
  }

  if (!reservation) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {String(t("systemPages.deleteReservationTitle"))}
          </DialogTitle>
          <DialogDescription>
            {String(
              t("systemPages.deleteReservationDescription", {
                code: reservation.reservationCode,
              }),
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleteMut.isPending}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => void handleDelete()}
            disabled={deleteMut.isPending}
          >
            {deleteMut.isPending ? (
              <Loader2Icon className="size-3.5 animate-spin" />
            ) : (
              <Trash2Icon className="size-3.5" />
            )}
            {t("common.delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
