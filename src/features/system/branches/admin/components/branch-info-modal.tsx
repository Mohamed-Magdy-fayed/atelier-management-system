"use client";

import { EntityAuditInfoDialog } from "@/features/core/data-table";
import type { BranchGridRow } from "@/integrations/trpc/routers/branches";

type BranchInfoModalProps = {
  branch: BranchGridRow | null;
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

export function BranchInfoModal({
  branch,
  onOpenChange,
  open,
}: BranchInfoModalProps) {
  return (
    <EntityAuditInfoDialog
      open={open}
      onOpenChange={onOpenChange}
      record={
        branch
          ? {
              id: branch.id,
              createdAt: branch.createdAt,
              updatedAt: branch.updatedAt,
            }
          : null
      }
    />
  );
}
