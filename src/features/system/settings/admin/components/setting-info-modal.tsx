"use client";

import { EntityAuditInfoDialog } from "@/features/core/data-table";
import type { SettingGridRow } from "@/integrations/trpc/routers/settings";

type SettingInfoModalProps = {
  setting: SettingGridRow | null;
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

export function SettingInfoModal({
  setting,
  onOpenChange,
  open,
}: SettingInfoModalProps) {
  return (
    <EntityAuditInfoDialog
      open={open}
      onOpenChange={onOpenChange}
      record={
        setting
          ? {
              id: setting.id,
              createdAt: setting.createdAt,
              updatedAt: setting.updatedAt,
            }
          : null
      }
    />
  );
}
