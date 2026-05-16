"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Table } from "@tanstack/react-table";
import { CheckCircle2Icon, PauseCircleIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslation } from "@/features/core/i18n/client";
import { useTRPC } from "@/integrations/trpc/client";
import type { SettingGridRow } from "@/integrations/trpc/routers/settings";

function selectedIds(table: Table<SettingGridRow>): string[] {
  return table.getFilteredSelectedRowModel().rows.map((row) => row.original.id);
}

export function SettingsBulkActions({
  table,
}: {
  table: Table<SettingGridRow>;
}) {
  const { t } = useTranslation();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const setActiveMut = useMutation(
    trpc.settings.bulkSetActive.mutationOptions(),
  );

  async function bulkSetActive(isActive: boolean) {
    const ids = selectedIds(table);
    if (!ids.length) return;

    try {
      await toast
        .promise(setActiveMut.mutateAsync({ ids, isActive }), {
          loading: String(t("common.saving")),
          success: String(
            t(
              isActive
                ? "systemPages.settingsBulkEnabledSuccess"
                : "systemPages.settingsBulkDisabledSuccess",
            ),
          ),
          error: String(t("systemPages.settingsBulkActiveFailed")),
        })
        .unwrap();
      await queryClient.invalidateQueries({
        queryKey: trpc.settings.pathKey(),
      });
      table.resetRowSelection();
    } catch {
      // toast handles error
    }
  }

  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={setActiveMut.isPending}
              onClick={() => void bulkSetActive(true)}
              aria-label={String(t("systemPages.settingsBulkEnable"))}
            >
              <CheckCircle2Icon className="size-3.5" />
            </Button>
          }
        />
        <TooltipContent>
          {String(t("systemPages.settingsBulkEnable"))}
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={setActiveMut.isPending}
              onClick={() => void bulkSetActive(false)}
              aria-label={String(t("systemPages.settingsBulkDisable"))}
            >
              <PauseCircleIcon className="size-3.5" />
            </Button>
          }
        />
        <TooltipContent>
          {String(t("systemPages.settingsBulkDisable"))}
        </TooltipContent>
      </Tooltip>
    </>
  );
}
