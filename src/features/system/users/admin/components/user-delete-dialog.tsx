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

type UserDeleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ids: string[];
  onDeleted?: () => void;
};

export function UserDeleteDialog({
  open,
  onOpenChange,
  ids,
  onDeleted,
}: UserDeleteDialogProps) {
  const { t } = useTranslation();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(false);

  const delMut = useMutation(trpc.users.softDelete.mutationOptions());
  const count = ids.length;

  async function handleConfirm() {
    if (!count) return;
    setPending(true);
    try {
      await toast
        .promise(delMut.mutateAsync({ ids }), {
          loading: String(t("common.deleting")),
          success: String(t("systemPages.userDeletedCount", { count })),
          error: (err) =>
            err instanceof Error
              ? err.message
              : String(t("systemPages.userDeleteFailed")),
        })
        .unwrap();
      await queryClient.invalidateQueries({ queryKey: trpc.users.pathKey() });
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
            {String(t("systemPages.deleteUsersTitle"))}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {String(t("systemPages.deleteUsersDescription", { count }))}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={pending}
            data-testid="user-delete-dialog-cancel"
          >
            <XIcon className="size-3.5" />
            {t("common.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending}
            data-testid="user-delete-dialog-confirm"
            onClick={(e) => {
              e.preventDefault();
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
