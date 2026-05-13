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
import type { ProductGridRow } from "@/integrations/trpc/routers/products";

type ProductDeleteDialogProps = {
  onDeleted?: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  product: ProductGridRow | null;
};

export function ProductDeleteDialog({
  onDeleted,
  onOpenChange,
  open,
  product,
}: ProductDeleteDialogProps) {
  const { t } = useTranslation();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const deleteMut = useMutation(trpc.products.delete.mutationOptions());
  const [pending, setPending] = useState(false);

  async function handleConfirm() {
    if (!product) return;

    setPending(true);
    try {
      await toast.promise(deleteMut.mutateAsync({ id: product.id }), {
        loading: String(t("common.deleting")),
        success: String(t("systemPages.productDeleted")),
        error: (err) =>
          err instanceof Error
            ? err.message
            : String(t("systemPages.productDeleteFailed")),
      }).unwrap();
      await queryClient.invalidateQueries({
        queryKey: trpc.products.pathKey(),
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
          <AlertDialogTitle>{String(t("systemPages.deleteProductsTitle"))}</AlertDialogTitle>
          <AlertDialogDescription>
            {product
              ? String(
                  t("systemPages.deleteProductsDescription", {
                    name: product.nameEn,
                  }),
                )
              : ""}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>
            <XIcon className="size-3.5" />
            {String(t("common.cancel"))}
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
