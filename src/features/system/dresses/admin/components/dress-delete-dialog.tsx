"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2Icon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslation } from "@/features/core/i18n/client";
import { useInvalidateDashboard } from "@/features/system/dashboard/lib/use-invalidate-dashboard";
import { useTRPC } from "@/integrations/trpc/client";
import type { DressGridRow } from "@/integrations/trpc/routers/dresses";

type DressDeleteDialogProps = {
  dress: DressGridRow | null;
  onDeleted: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

export function DressDeleteDialog({
  dress,
  onDeleted,
  onOpenChange,
  open,
}: DressDeleteDialogProps) {
  const { t } = useTranslation();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const invalidateDashboard = useInvalidateDashboard();
  const deleteMut = useMutation(trpc.dresses.delete.mutationOptions());

  async function handleDelete() {
    if (!dress) return;

    try {
      await toast
        .promise(deleteMut.mutateAsync({ id: dress.id }), {
          loading: String(t("common.deleting")),
          success: String(t("systemPages.dressDeleted")),
          error: (err) =>
            err instanceof Error
              ? err.message
              : String(t("systemPages.dressDeleteFailed")),
        })
        .unwrap();

      await queryClient.invalidateQueries({
        queryKey: trpc.dresses.pathKey(),
      });
      await invalidateDashboard();
      onDeleted();
      onOpenChange(false);
    } catch {
      // toast.promise already surfaced the failure.
    }
  }

  if (!dress) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{String(t("systemPages.deleteDressTitle"))}</DialogTitle>
          <DialogDescription>
            {String(
              t("systemPages.deleteDressDescription", {
                code: dress.code,
              }),
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleteMut.isPending}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => void handleDelete()}
            disabled={deleteMut.isPending}
          >
            {deleteMut.isPending ? (
              <Loader2Icon className="size-3.5 animate-spin" />
            ) : (
              <Trash2Icon className="size-3.5" />
            )}
            {t("common.delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
