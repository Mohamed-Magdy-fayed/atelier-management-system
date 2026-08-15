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
import { useScreenPermission } from "@/features/core/auth/nextjs/hooks/use-screen-permission";
import { useTranslation } from "@/features/core/i18n/client";
import { useInvalidateDashboard } from "@/features/system/dashboard/lib/use-invalidate-dashboard";
import { useTRPC } from "@/integrations/trpc/client";
import type { DressGridRow } from "@/integrations/trpc/routers/dresses";

export type DressRowActionVariant = "info" | "edit" | "delete";

export type SetDressRowAction = (
  next: { row: DressGridRow; variant: DressRowActionVariant } | null,
) => void;

type DressRowActionsProps = {
  row: DressGridRow;
  setRowAction: SetDressRowAction;
};

export function DressRowActions({ row, setRowAction }: DressRowActionsProps) {
  const { t } = useTranslation();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const invalidateDashboard = useInvalidateDashboard();
  const setActiveMut = useMutation(trpc.dresses.setActive.mutationOptions());
  const { canView, canUpdate, canDelete } = useScreenPermission("dresses");

  async function toggleActive(isActive: boolean) {
    try {
      await toast
        .promise(setActiveMut.mutateAsync({ id: row.id, isActive }), {
          loading: String(t("common.saving")),
          success: String(
            t(
              isActive
                ? "systemPages.dressActivated"
                : "systemPages.dressDeactivated",
            ),
          ),
          error: (err) =>
            err instanceof Error
              ? err.message
              : String(t("systemPages.dressStatusChangeFailed")),
        })
        .unwrap();

      await queryClient.invalidateQueries({
        queryKey: trpc.dresses.pathKey(),
      });
      await invalidateDashboard();
    } catch {
      // toast.promise already surfaced the failure.
    }
  }

  // An empty menu behind a working trigger reads as broken, so the trigger goes
  // too when nothing is permitted.
  if (!canView && !canUpdate && !canDelete) return null;

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
        {canView ? (
          <DropdownMenuItem
            onClick={() => setRowAction({ row, variant: "info" })}
          >
            <InfoIcon className="size-3.5" />
            {String(t("common.info"))}
          </DropdownMenuItem>
        ) : null}
        {canUpdate ? (
          <>
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
                    ? "systemPages.dressDeactivate"
                    : "systemPages.dressActivate",
                ),
              )}
            </DropdownMenuItem>
          </>
        ) : null}
        {canDelete ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setRowAction({ row, variant: "delete" })}
            >
              <Trash2Icon className="size-3.5 text-destructive" />
              <span className="text-destructive">
                {String(t("common.delete"))}
              </span>
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
