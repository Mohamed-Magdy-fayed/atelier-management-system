"use client";

import { EntityAuditInfoDialog } from "@/features/core/data-table";
import type { UserGridRow } from "@/integrations/trpc/routers/users";

type UserInfoModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserGridRow | null;
};

export function UserInfoModal({
  open,
  onOpenChange,
  user,
}: UserInfoModalProps) {
  return (
    <EntityAuditInfoDialog
      open={open}
      onOpenChange={onOpenChange}
      record={
        user
          ? {
              id: user.id,
              createdAt: user.createdAt,
              createdBy: user.createdBy,
              updatedAt: user.updatedAt,
              updatedBy: user.updatedBy,
              deletedAt: user.deletedAt,
              deletedBy: user.deletedBy,
            }
          : null
      }
    />
  );
}
