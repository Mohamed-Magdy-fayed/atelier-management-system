"use client";

import { EditIcon, MoreHorizontalIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useScreenPermission } from "@/features/core/auth/nextjs/hooks/use-screen-permission";
import { useTranslation } from "@/features/core/i18n/client";
import type { RentalCustomerGridRow } from "@/integrations/trpc/routers/rental-customers";

export type RentalCustomerRowActionVariant = "edit";

export type SetRentalCustomerRowAction = (
  next: {
    row: RentalCustomerGridRow;
    variant: RentalCustomerRowActionVariant;
  } | null,
) => void;

type RentalCustomerRowActionsProps = {
  row: RentalCustomerGridRow;
  setRowAction: SetRentalCustomerRowAction;
};

export function RentalCustomerRowActions({
  row,
  setRowAction,
}: RentalCustomerRowActionsProps) {
  const { t } = useTranslation();
  const { canUpdate } = useScreenPermission("customers");

  // Edit is the only action on this grid, so no update grant means no menu.
  if (!canUpdate) return null;

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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
