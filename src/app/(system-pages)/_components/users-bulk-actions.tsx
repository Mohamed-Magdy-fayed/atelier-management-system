"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Table } from "@tanstack/react-table";
import { MailCheckIcon, MailXIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslation } from "@/features/core/i18n/client";
import { useTRPC } from "@/integrations/trpc/client";
import type { UserGridRow } from "@/integrations/trpc/routers/users";

import { UserDeleteDialog } from "./user-delete-dialog";

function selectedIds(table: Table<UserGridRow>): string[] {
  return table.getFilteredSelectedRowModel().rows.map((r) => r.original.id);
}

export function UsersBulkActions({ table }: { table: Table<UserGridRow> }) {
  const { t } = useTranslation();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const verifyMut = useMutation(trpc.users.bulkSetVerified.mutationOptions());

  const [deleteOpen, setDeleteOpen] = useState(false);

  async function bulkVerify(verified: boolean) {
    const ids = selectedIds(table);
    if (!ids.length) return;
    try {
      await toast
        .promise(verifyMut.mutateAsync({ ids, verified }), {
          loading: String(
            t(
              verified
                ? "systemPages.bulkVerifying"
                : "systemPages.bulkUnverifying",
            ),
          ),
          success: String(
            t(
              verified
                ? "systemPages.bulkVerifiedSuccess"
                : "systemPages.bulkUnverifiedSuccess",
              { count: ids.length },
            ),
          ),
          error: (err) =>
            err instanceof Error
              ? err.message
              : String(t("systemPages.bulkVerifyFailed")),
        })
        .unwrap();
      await queryClient.invalidateQueries({
        queryKey: trpc.users.pathKey(),
      });
      table.resetRowSelection();
    } catch {
      // toast already surfaced the error
    }
  }

  const ids = selectedIds(table);

  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              type="button"
              disabled={verifyMut.isPending}
              onClick={() => void bulkVerify(true)}
              aria-label={String(t("systemPages.bulkVerify"))}
            >
              <MailCheckIcon className="size-3.5" />
            </Button>
          }
        />
        <TooltipContent>{String(t("systemPages.bulkVerify"))}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              type="button"
              disabled={verifyMut.isPending}
              onClick={() => void bulkVerify(false)}
              aria-label={String(t("systemPages.bulkUnverify"))}
            >
              <MailXIcon className="size-3.5" />
            </Button>
          }
        />
        <TooltipContent>{String(t("systemPages.bulkUnverify"))}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              type="button"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setDeleteOpen(true)}
              aria-label={String(t("common.delete"))}
            >
              <Trash2Icon className="size-3.5" />
            </Button>
          }
        />
        <TooltipContent>{String(t("common.delete"))}</TooltipContent>
      </Tooltip>
      <UserDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        ids={ids}
        onDeleted={() => table.resetRowSelection()}
      />
    </>
  );
}
