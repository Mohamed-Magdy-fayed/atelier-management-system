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
import type { Service } from "@/integrations/trpc/routers/services-mgmt";

type Props = {
  service: Service | null;
  onDeleted?: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

export function ServiceDeleteDialog({
  service,
  onDeleted,
  onOpenChange,
  open,
}: Props) {
  const { t } = useTranslation();
  const trpc = useTRPC();
  const qc = useQueryClient();
  const deleteMut = useMutation(trpc.servicesMgmt.delete.mutationOptions());
  const [pending, setPending] = useState(false);

  async function handleConfirm() {
    if (!service) return;
    setPending(true);
    try {
      await toast
        .promise(deleteMut.mutateAsync({ id: service.id }), {
          loading: String(t("common.deleting")),
          success: String(t("services.serviceDeleted")),
          error: (err) =>
            err instanceof Error
              ? err.message
              : String(t("services.serviceDeleteFailed")),
        })
        .unwrap();
      await qc.invalidateQueries({ queryKey: trpc.servicesMgmt.pathKey() });
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
            {String(t("services.deleteServiceTitle"))}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {service
              ? String(
                  t("services.deleteServiceDescription", {
                    title: service.title,
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
