"use client";

import { EntityAuditInfoDialog } from "@/features/core/data-table";
import type { DressGridRow } from "@/integrations/trpc/routers/dresses";

type DressInfoModalProps = {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  dress: DressGridRow | null;
};

export function DressInfoModal({
  onOpenChange,
  open,
  dress,
}: DressInfoModalProps) {
  return (
    <EntityAuditInfoDialog
      open={open}
      onOpenChange={onOpenChange}
      record={
        dress
          ? {
              id: dress.id,
              createdAt: dress.createdAt,
              createdBy: dress.createdBy,
              updatedAt: dress.updatedAt,
              updatedBy: dress.updatedBy,
            }
          : null
      }
    />
  );
}
