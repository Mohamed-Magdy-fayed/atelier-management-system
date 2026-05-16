"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2Icon,
  InfoIcon,
  MoreHorizontalIcon,
  PauseCircleIcon,
  PencilIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "@/features/core/i18n/client";
import { getSystemSettingDefinition } from "@/features/system/settings/lib/system-settings-registry";
import { useTRPC } from "@/integrations/trpc/client";
import type { SettingGridRow } from "@/integrations/trpc/routers/settings";

export type SettingRowActionVariant = "info" | "edit";

export type SetSettingRowAction = (
  next: { row: SettingGridRow; variant: SettingRowActionVariant } | null,
) => void;

type SettingRowActionsProps = {
  row: SettingGridRow;
  setRowAction: SetSettingRowAction;
};

export function SettingRowActions({
  row,
  setRowAction,
}: SettingRowActionsProps) {
  const { t } = useTranslation();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const setActiveMut = useMutation(trpc.settings.setActive.mutationOptions());
  const definition = getSystemSettingDefinition(row.code);
  const canToggleStatus = definition?.editable.isActive === true;
  const isEnabled = row.isActive === true;

  async function toggleActive(isActive: boolean) {
    try {
      await toast
        .promise(setActiveMut.mutateAsync({ id: row.id, isActive }), {
          loading: String(t("common.saving")),
          success: String(
            t(
              isActive
                ? "systemPages.settingEnabled"
                : "systemPages.settingDisabled",
            ),
          ),
          error: String(t("systemPages.settingsBulkActiveFailed")),
        })
        .unwrap();

      await queryClient.invalidateQueries({
        queryKey: trpc.settings.pathKey(),
      });
    } catch {
      // toast.promise already surfaced the failure.
    }
  }

  return (
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
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem
          onClick={() => setRowAction({ row, variant: "info" })}
        >
          <InfoIcon className="size-3.5" />
          {String(t("common.info"))}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setRowAction({ row, variant: "edit" })}
        >
          <PencilIcon className="size-3.5" />
          {String(t("common.edit"))}
        </DropdownMenuItem>
        {canToggleStatus ? (
          <DropdownMenuItem
            disabled={setActiveMut.isPending}
            onClick={() => void toggleActive(!isEnabled)}
          >
            {isEnabled ? (
              <PauseCircleIcon className="size-3.5" />
            ) : (
              <CheckCircle2Icon className="size-3.5" />
            )}
            {String(
              t(
                isEnabled
                  ? "systemPages.settingDisable"
                  : "systemPages.settingEnable",
              ),
            )}
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
