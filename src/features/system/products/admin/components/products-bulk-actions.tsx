"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Table } from "@tanstack/react-table";
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  Loader2Icon,
  PauseCircleIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslation } from "@/features/core/i18n/client";
import { useTRPC } from "@/integrations/trpc/client";
import type { ProductGridRow } from "@/integrations/trpc/routers/products";

function selectedIds(table: Table<ProductGridRow>): string[] {
  return table.getFilteredSelectedRowModel().rows.map((row) => row.original.id);
}

export function ProductsBulkActions({ table }: { table: Table<ProductGridRow> }) {
  const { t } = useTranslation();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const setActiveMut = useMutation(trpc.products.bulkSetActive.mutationOptions());
  const archiveMut = useMutation(trpc.products.bulkArchive.mutationOptions());
  const [archiveOpen, setArchiveOpen] = useState(false);

  async function bulkSetActive(isActive: boolean) {
    const ids = selectedIds(table);
    if (!ids.length) return;

    try {
      await toast
        .promise(setActiveMut.mutateAsync({ ids, isActive }), {
          loading: String(
            t(
              isActive
                ? "systemPages.bulkActivatingProducts"
                : "systemPages.bulkDeactivatingProducts",
            ),
          ),
          success: String(
            t(
              isActive
                ? "systemPages.bulkProductsActivatedSuccess"
                : "systemPages.bulkProductsDeactivatedSuccess",
              { count: ids.length },
            ),
          ),
          error: (error) =>
            error instanceof Error
              ? error.message
              : String(t("systemPages.bulkProductStatusFailed")),
        })
        .unwrap();

      await queryClient.invalidateQueries({
        queryKey: trpc.products.pathKey(),
      });
      table.resetRowSelection();
    } catch {
      // toast.promise already surfaced the failure.
    }
  }

  async function confirmArchive() {
    const ids = selectedIds(table);
    if (!ids.length) return;

    try {
      await toast
        .promise(archiveMut.mutateAsync({ ids }), {
          loading: String(t("common.deleting")),
          success: String(
            t("systemPages.bulkProductsArchivedSuccess", { count: ids.length }),
          ),
          error: (error) =>
            error instanceof Error
              ? error.message
              : String(t("systemPages.bulkProductArchiveFailed")),
        })
        .unwrap();

      await queryClient.invalidateQueries({
        queryKey: trpc.products.pathKey(),
      });
      table.resetRowSelection();
      setArchiveOpen(false);
    } catch {
      // toast.promise already surfaced the failure.
    }
  }

  const ids = selectedIds(table);
  const isBusy = setActiveMut.isPending || archiveMut.isPending;

  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              type="button"
              disabled={isBusy}
              onClick={() => void bulkSetActive(true)}
              aria-label={String(t("systemPages.bulkActivateProducts"))}
            >
              <CheckCircle2Icon className="size-3.5" />
            </Button>
          }
        />
        <TooltipContent>{String(t("systemPages.bulkActivateProducts"))}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              type="button"
              disabled={isBusy}
              onClick={() => void bulkSetActive(false)}
              aria-label={String(t("systemPages.bulkDeactivateProducts"))}
            >
              <PauseCircleIcon className="size-3.5" />
            </Button>
          }
        />
        <TooltipContent>{String(t("systemPages.bulkDeactivateProducts"))}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              type="button"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              disabled={isBusy}
              onClick={() => setArchiveOpen(true)}
              aria-label={String(t("systemPages.bulkArchiveProducts"))}
            >
              <Trash2Icon className="size-3.5" />
            </Button>
          }
        />
        <TooltipContent>{String(t("systemPages.bulkArchiveProducts"))}</TooltipContent>
      </Tooltip>

      <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {String(t("systemPages.bulkArchiveProductsTitle"))}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {String(
                t("systemPages.bulkArchiveProductsDescription", {
                  count: ids.length,
                }),
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={archiveMut.isPending}>
              <XIcon className="size-3.5" />
              {String(t("common.cancel"))}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={archiveMut.isPending}
              onClick={(event) => {
                event.preventDefault();
                void confirmArchive();
              }}
            >
              {archiveMut.isPending ? (
                <Loader2Icon className="size-3.5 animate-spin" />
              ) : (
                <AlertTriangleIcon className="size-3.5" />
              )}
              {String(t("systemPages.bulkArchiveProducts"))}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
