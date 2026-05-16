"use client";

import { EntityAuditInfoDialog } from "@/features/core/data-table";
import type { PaymentGridRow } from "@/integrations/trpc/routers/payments";

type PaymentInfoModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: PaymentGridRow | null;
};

export function PaymentInfoModal({
  open,
  onOpenChange,
  payment,
}: PaymentInfoModalProps) {
  return (
    <EntityAuditInfoDialog
      open={open}
      onOpenChange={onOpenChange}
      record={
        payment
          ? {
              id: payment.id,
              createdAt: payment.createdAt,
              createdBy: payment.createdBy,
            }
          : null
      }
    />
  );
}
