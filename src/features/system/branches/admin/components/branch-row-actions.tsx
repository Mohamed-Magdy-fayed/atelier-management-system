"use client";

import {
  InfoIcon,
  ListStartIcon,
  MoreHorizontalIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setActiveBranchForUserAction } from "@/features/core/auth/nextjs/actions";
import { useTranslation } from "@/features/core/i18n/client";
import type { BranchGridRow } from "@/integrations/trpc/routers/branches";

export type BranchRowActionVariant = "info" | "edit" | "delete";

export type SetBranchRowAction = (
  next: { row: BranchGridRow; variant: BranchRowActionVariant } | null,
) => void;

type BranchRowActionsProps = {
  row: BranchGridRow;
  setRowAction: SetBranchRowAction;
};

export function BranchRowActions({
  row,
  setRowAction,
}: BranchRowActionsProps) {
  const { t } = useTranslation();
  const [isPending, startTransition] = useTransition();

  function setActiveBranch() {
    startTransition(async () => {
      const result = await setActiveBranchForUserAction(row.id);
      if (result.isError) {
        toast.error(result.message);
        return;
      }

      toast.success(String(t("authTranslations.branch.actions.setActiveBranch.success")));
    });
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
        <DropdownMenuItem onClick={() => setRowAction({ row, variant: "info" })}>
          <InfoIcon className="size-3.5" />
          {String(t("common.info"))}
        </DropdownMenuItem>
        <DropdownMenuItem disabled={isPending} onClick={() => void setActiveBranch()}>
          <ListStartIcon className="size-3.5" />
          {String(t("authTranslations.branch.switcher.setActive"))}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setRowAction({ row, variant: "edit" })}>
          <PencilIcon className="size-3.5" />
          {String(t("common.edit"))}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setRowAction({ row, variant: "delete" })}>
          <Trash2Icon className="size-3.5 text-destructive" />
          <span className="text-destructive">{String(t("common.delete"))}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
