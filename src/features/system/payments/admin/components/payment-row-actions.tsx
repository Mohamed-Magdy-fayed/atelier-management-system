"use client";

import { InfoIcon, MoreHorizontalIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "@/features/core/i18n/client";
import type { PaymentGridRow } from "@/integrations/trpc/routers/payments";

export type PaymentRowActionVariant = "info";

export type SetPaymentRowAction = (
  next: { row: PaymentGridRow; variant: PaymentRowActionVariant } | null,
) => void;

type PaymentRowActionsProps = {
  row: PaymentGridRow;
  setRowAction: SetPaymentRowAction;
};

export function PaymentRowActions({
  row,
  setRowAction,
}: PaymentRowActionsProps) {
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
        <DropdownMenuItem
          onClick={() => setRowAction({ row, variant: "info" })}
        >
          <InfoIcon className="size-3.5" />
          {String(t("common.info"))}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
