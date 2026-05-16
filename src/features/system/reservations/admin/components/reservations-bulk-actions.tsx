"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Table } from "@tanstack/react-table";
import { CheckCircle2Icon, Trash2Icon } from "lucide-react";
import { useCallback, useState } from "react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { reservationStatuses } from "@/drizzle/schemas/system/reservations-table";
import { useTranslation } from "@/features/core/i18n/client";
import { useTRPC } from "@/integrations/trpc/client";
import type { ReservationGridRow } from "@/integrations/trpc/routers/reservations";

function statusLabelKey(status: (typeof reservationStatuses)[number]) {
  switch (status) {
    case "reserved":
      return "systemPages.reservationStatusReserved" as const;
    case "pickedUp":
      return "systemPages.reservationStatusPickedUp" as const;
    case "returned":
      return "systemPages.reservationStatusReturned" as const;
    case "cancelled":
      return "systemPages.reservationStatusCancelled" as const;
  }
}

function selectedIds(table: Table<ReservationGridRow>): string[] {
  return table.getFilteredSelectedRowModel().rows.map((row) => row.original.id);
}

export function ReservationsBulkActions({
  table,
}: {
  table: Table<ReservationGridRow>;
}) {
  const { t } = useTranslation();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const bulkStatusMut = useMutation(
    trpc.reservations.bulkUpdateStatus.mutationOptions(),
  );
  const bulkDeleteMut = useMutation(
    trpc.reservations.bulkDelete.mutationOptions(),
  );

  const ids = selectedIds(table);
  const pending = bulkStatusMut.isPending || bulkDeleteMut.isPending;

  const bulkUpdateStatus = useCallback(
    async (status: (typeof reservationStatuses)[number]) => {
      if (!ids.length) return;
      try {
        await toast
          .promise(bulkStatusMut.mutateAsync({ ids, status }), {
            loading: String(t("common.saving")),
            success: String(t("systemPages.reservationsBulkStatusSuccess")),
            error: String(t("systemPages.reservationSaveFailed")),
          })
          .unwrap();
        await queryClient.invalidateQueries({
          queryKey: trpc.reservations.pathKey(),
        });
        table.resetRowSelection();
      } catch {
        // toast handles error
      }
    },
    [bulkStatusMut, ids, queryClient, t, table, trpc.reservations],
  );

  const bulkDelete = useCallback(async () => {
    if (!ids.length) return;
    try {
      await toast
        .promise(bulkDeleteMut.mutateAsync({ ids }), {
          loading: String(t("common.deleting")),
          success: String(t("systemPages.reservationsBulkDeletedSuccess")),
          error: String(t("systemPages.reservationDeleteFailed")),
        })
        .unwrap();
      await queryClient.invalidateQueries({
        queryKey: trpc.reservations.pathKey(),
      });
      table.resetRowSelection();
      setDeleteOpen(false);
    } catch {
      // toast handles error
    }
  }, [bulkDeleteMut, ids, queryClient, t, table, trpc.reservations]);

  return (
    <>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger
            render={
              <DropdownMenuTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={pending || !ids.length}
                    aria-label={String(t("systemPages.reservationsUpdatedStatus"))}
                  >
                    <CheckCircle2Icon className="size-3.5" />
                  </Button>
                }
              />
            }
          />
          <TooltipContent>
            {String(t("systemPages.reservationsUpdatedStatus"))}
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="center">
          {reservationStatuses.map((status) => (
            <DropdownMenuItem
              key={status}
              onClick={() => void bulkUpdateStatus(status)}
            >
              {String(t(statusLabelKey(status)))}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              disabled={pending || !ids.length}
              onClick={() => setDeleteOpen(true)}
              aria-label={String(t("common.delete"))}
            >
              <Trash2Icon className="size-3.5" />
            </Button>
          }
        />
        <TooltipContent>{String(t("common.delete"))}</TooltipContent>
      </Tooltip>

      <AlertDialog onOpenChange={setDeleteOpen} open={deleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {String(t("systemPages.deleteReservationTitle"))}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {String(
                t("systemPages.reservationsBulkDeleteConfirm", {
                  count: String(ids.length),
                }),
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void bulkDelete()}>
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
