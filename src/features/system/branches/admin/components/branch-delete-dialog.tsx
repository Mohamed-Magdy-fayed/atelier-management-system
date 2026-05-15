"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2Icon, Trash2Icon, XIcon } from "lucide-react";
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
import { useTranslation } from "@/features/core/i18n/client";
import { useTRPC } from "@/integrations/trpc/client";
import type { BranchGridRow } from "@/integrations/trpc/routers/branches";

type BranchDeleteDialogProps = {
  branch: BranchGridRow | null;
  onDeleted?: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

export function BranchDeleteDialog({
  branch,
  onDeleted,
  onOpenChange,
  open,
}: BranchDeleteDialogProps) {
  const { t } = useTranslation();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const deleteMut = useMutation(trpc.branches.delete.mutationOptions());
  const [pending, setPending] = useState(false);

  async function handleConfirm() {
    if (!branch) return;

    setPending(true);
    try {
      await toast
        .promise(deleteMut.mutateAsync({ id: branch.id }), {
          loading: String(t("common.deleting")),
          success: String(t("systemPages.branchDeleted")),
          error: (err) =>
            err instanceof Error
              ? err.message
              : String(t("systemPages.branchDeleteFailed")),
        })
        .unwrap();
      await queryClient.invalidateQueries({
        queryKey: trpc.branches.pathKey(),
      });
      onDeleted?.();
      onOpenChange(false);
    } catch {
      // toast.promise already surfaced the failure.
    } finally {
      setPending(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {String(t("systemPages.deleteBranchesTitle"))}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {branch
              ? String(
                  t("systemPages.deleteBranchesDescription", {
                    name: branch.nameEn,
                  }),
                )
              : ""}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>
            <XIcon className="size-3.5" />
            {t("common.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending}
            onClick={(event) => {
              event.preventDefault();
              void handleConfirm();
            }}
          >
            {pending ? (
              <Loader2Icon className="size-3.5 animate-spin" />
            ) : (
              <Trash2Icon className="size-3.5" />
            )}
            {pending
              ? String(t("common.deleting"))
              : String(t("common.delete"))}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
