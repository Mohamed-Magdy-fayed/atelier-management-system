"use client";

import { EntityAuditInfoDialog } from "@/features/core/data-table";
import type { ReservationGridRow } from "@/integrations/trpc/routers/reservations";

type ReservationInfoModalProps = {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  reservation: ReservationGridRow | null;
};

export function ReservationInfoModal({
  onOpenChange,
  open,
  reservation,
}: ReservationInfoModalProps) {
  return (
    <EntityAuditInfoDialog
      open={open}
      onOpenChange={onOpenChange}
      record={
        reservation
          ? {
              id: reservation.id,
              createdAt: reservation.createdAt,
              createdBy: reservation.createdBy,
              updatedAt: reservation.updatedAt,
              updatedBy: reservation.updatedBy,
              deletedAt: reservation.deletedAt,
              deletedBy: reservation.deletedBy,
            }
          : null
      }
    />
  );
}
