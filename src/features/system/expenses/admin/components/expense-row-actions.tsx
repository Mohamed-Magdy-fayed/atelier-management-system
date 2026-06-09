"use client";

import { EditIcon, MoreHorizontalIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "@/features/core/i18n/client";
import type { ExpenseGridRow } from "@/integrations/trpc/routers/expenses";

export type ExpenseRowActionVariant = "edit" | "delete";

export type SetExpenseRowAction = (
  next: { row: ExpenseGridRow; variant: ExpenseRowActionVariant } | null,
) => void;

type ExpenseRowActionsProps = {
  row: ExpenseGridRow;
  setRowAction: SetExpenseRowAction;
};

export function ExpenseRowActions({ row, setRowAction }: ExpenseRowActionsProps) {
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
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem onClick={() => setRowAction({ row, variant: "edit" })}>
          <EditIcon className="size-3.5" />
          {String(t("common.edit"))}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => setRowAction({ row, variant: "delete" })}
        >
          <Trash2Icon className="size-3.5" />
          {String(t("common.delete"))}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
