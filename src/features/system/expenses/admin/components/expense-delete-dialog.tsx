"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2Icon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/features/core/i18n/client";
import { useInvalidateDashboard } from "@/features/system/dashboard/lib/use-invalidate-dashboard";
import { useTRPC } from "@/integrations/trpc/client";
import type { ExpenseGridRow } from "@/integrations/trpc/routers/expenses";

type ExpenseDeleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: ExpenseGridRow | null;
};

export function ExpenseDeleteDialog({
  open,
  onOpenChange,
  expense,
}: ExpenseDeleteDialogProps) {
  const { t } = useTranslation();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const invalidateDashboard = useInvalidateDashboard();
  const deleteMut = useMutation(trpc.expenses.delete.mutationOptions());

  if (!expense) return null;

  const handleDelete = async () => {
    try {
      await toast
        .promise(deleteMut.mutateAsync({ id: expense.id }), {
          loading: String(t("common.deleting")),
          success: String(t("systemPages.expenseDeleted")),
          error: (err) =>
            err instanceof Error ? err.message : String(t("systemPages.expenseDeleteFailed")),
        })
        .unwrap();
      await queryClient.invalidateQueries({ queryKey: trpc.expenses.pathKey() });
      await invalidateDashboard();
      onOpenChange(false);
    } catch {
      // toast surfaced error
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {String(t("systemPages.deleteExpenseTitle"))}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {String(t("systemPages.deleteExpenseDescription"))}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMut.isPending}>
            {String(t("common.cancel"))}
          </AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteMut.isPending}
          >
            {deleteMut.isPending ? (
              <Loader2Icon className="size-3.5 animate-spin" />
            ) : (
              <Trash2Icon className="size-3.5" />
            )}
            {String(t("common.delete"))}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
