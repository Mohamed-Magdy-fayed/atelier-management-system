"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2Icon,
  InfoIcon,
  MoreHorizontalIcon,
  PauseCircleIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "@/features/core/i18n/client";
import { useTRPC } from "@/integrations/trpc/client";
import type { ProductGridRow } from "@/integrations/trpc/routers/products";

export type ProductRowActionVariant = "info" | "edit" | "delete";

export type SetProductRowAction = (
  next: { row: ProductGridRow; variant: ProductRowActionVariant } | null,
) => void;

type ProductRowActionsProps = {
  row: ProductGridRow;
  setRowAction: SetProductRowAction;
};

export function ProductRowActions({
  row,
  setRowAction,
}: ProductRowActionsProps) {
  const { t } = useTranslation();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const setActiveMut = useMutation(trpc.products.setActive.mutationOptions());

  async function toggleActive(isActive: boolean) {
    try {
      await toast
        .promise(setActiveMut.mutateAsync({ id: row.id, isActive }), {
          loading: String(t("common.saving")),
          success: String(
            t(
              isActive
                ? "systemPages.productActivated"
                : "systemPages.productDeactivated",
            ),
          ),
          error: (err) =>
            err instanceof Error
              ? err.message
              : String(t("systemPages.productStatusChangeFailed")),
        })
        .unwrap();

      await queryClient.invalidateQueries({
        queryKey: trpc.products.pathKey(),
      });
    } catch {
      // toast.promise already surfaced the failure.
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className="size-8"
            aria-label={String(t("common.openMenu"))}
          >
            <MoreHorizontalIcon className="size-3.5" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem
          onClick={() => setRowAction({ row, variant: "info" })}
        >
          <InfoIcon className="size-3.5" />
          {String(t("common.info"))}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setRowAction({ row, variant: "edit" })}
        >
          <PencilIcon className="size-3.5" />
          {String(t("common.edit"))}
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={setActiveMut.isPending}
          onClick={() => void toggleActive(!row.isActive)}
        >
          {row.isActive ? (
            <PauseCircleIcon className="size-3.5" />
          ) : (
            <CheckCircle2Icon className="size-3.5" />
          )}
          {String(
            t(
              row.isActive
                ? "systemPages.productDeactivate"
                : "systemPages.productActivate",
            ),
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => setRowAction({ row, variant: "delete" })}
        >
          <Trash2Icon className="size-3.5 text-destructive" />
          <span className="text-destructive">{String(t("common.delete"))}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
