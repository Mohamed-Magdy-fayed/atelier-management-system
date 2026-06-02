"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Table } from "@tanstack/react-table";
import {
  CheckCircle2Icon,
  Loader2Icon,
  PauseCircleIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslation } from "@/features/core/i18n/client";
import { useTRPC } from "@/integrations/trpc/client";
import type { DressGridRow } from "@/integrations/trpc/routers/dresses";

function selectedIds(table: Table<DressGridRow>): string[] {
  return table.getFilteredSelectedRowModel().rows.map((row) => row.original.id);
}

export function DressesBulkActions({ table }: { table: Table<DressGridRow> }) {
  const { t } = useTranslation();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const setActiveMut = useMutation(
    trpc.dresses.bulkSetActive.mutationOptions(),
  );
  const archiveMut = useMutation(trpc.dresses.bulkArchive.mutationOptions());

  async function bulkSetActive(isActive: boolean) {
    const ids = selectedIds(table);
    if (!ids.length) return;

    try {
      await toast
        .promise(setActiveMut.mutateAsync({ ids, isActive }), {
          loading: String(t("common.saving")),
          success: String(t("systemPages.bulkDressesStatusSuccess")),
          error: String(t("systemPages.bulkDressStatusFailed")),
        })
        .unwrap();
      await queryClient.invalidateQueries({ queryKey: trpc.dresses.pathKey() });
      table.resetRowSelection();
    } catch {
      // toast.promise already surfaced the failure.
    }
  }

  async function bulkArchive() {
    const ids = selectedIds(table);
    if (!ids.length) return;

    try {
      await toast
        .promise(archiveMut.mutateAsync({ ids }), {
          loading: String(t("common.deleting")),
          success: String(t("systemPages.bulkDressesArchivedSuccess")),
          error: String(t("systemPages.bulkDressArchiveFailed")),
        })
        .unwrap();
      await queryClient.invalidateQueries({ queryKey: trpc.dresses.pathKey() });
      table.resetRowSelection();
    } catch {
      // toast.promise already surfaced the failure.
    }
  }

  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="size-8"
              disabled={setActiveMut.isPending}
              onClick={() => void bulkSetActive(true)}
            >
              {setActiveMut.isPending ? (
                <Loader2Icon className="size-3.5 animate-spin" />
              ) : (
                <CheckCircle2Icon className="size-3.5" />
              )}
            </Button>
          }
        />
        <TooltipContent>
          {String(t("systemPages.bulkActivateDresses"))}
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="size-8"
              disabled={setActiveMut.isPending}
              onClick={() => void bulkSetActive(false)}
            >
              <PauseCircleIcon className="size-3.5" />
            </Button>
          }
        />
        <TooltipContent>
          {String(t("systemPages.bulkDeactivateDresses"))}
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="size-8"
              disabled={archiveMut.isPending}
              onClick={() => void bulkArchive()}
            >
              {archiveMut.isPending ? (
                <Loader2Icon className="size-3.5 animate-spin" />
              ) : (
                <Trash2Icon className="size-3.5" />
              )}
            </Button>
          }
        />
        <TooltipContent>
          {String(t("systemPages.bulkArchiveDresses"))}
        </TooltipContent>
      </Tooltip>
    </>
  );
}
