"use client";

import {
  CopyIcon,
  InfoIcon,
  MoreHorizontalIcon,
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
        <DropdownMenuItem onClick={() => setRowAction({ row, variant: "edit" })}>
          <PencilIcon className="size-3.5" />
          {String(t("common.edit"))}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            void navigator.clipboard.writeText(row.id);
            toast.success(String(t("dataTable.copyRowId")));
          }}
        >
          <CopyIcon className="size-3.5" />
          {String(t("dataTable.copyRowId"))}
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
