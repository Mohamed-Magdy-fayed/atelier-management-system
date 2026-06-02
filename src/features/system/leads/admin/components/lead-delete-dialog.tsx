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
import type { Lead } from "@/integrations/trpc/routers/leads";

type Props = {
  lead: Lead | null;
  onDeleted?: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

export function LeadDeleteDialog({
  lead,
  onDeleted,
  onOpenChange,
  open,
}: Props) {
  const { t } = useTranslation();
  const trpc = useTRPC();
  const qc = useQueryClient();
  const deleteMut = useMutation(trpc.leads.delete.mutationOptions());
  const [pending, setPending] = useState(false);

  async function handleConfirm() {
    if (!lead) return;
    setPending(true);
    try {
      await toast
        .promise(deleteMut.mutateAsync({ id: lead.id }), {
          loading: String(t("common.deleting")),
          success: String(t("leads.leadDeleted")),
          error: (err) =>
            err instanceof Error
              ? err.message
              : String(t("leads.leadDeleteFailed")),
        })
        .unwrap();
      await qc.invalidateQueries({ queryKey: trpc.leads.pathKey() });
      onDeleted?.();
      onOpenChange(false);
    } catch {
      /* surfaced */
    } finally {
      setPending(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {String(t("leads.deleteLeadTitle"))}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {String(t("leads.deleteLeadDescription"))}
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
