"use client";

import type { Table } from "@tanstack/react-table";
import { DownloadIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { downloadCsv, rowsToCsv } from "@/features/core/data-table";
import { useTranslation } from "@/features/core/i18n/client";
import type { PaymentGridRow } from "@/integrations/trpc/routers/payments";

export function PaymentsBulkActions({
  table,
}: {
  table: Table<PaymentGridRow>;
}) {
  const { t } = useTranslation();

  function exportSelected() {
    const rows = table.getFilteredSelectedRowModel().rows;
    if (!rows.length) return;

    const headers = [
      "id",
      "amount",
      "type",
      "method",
      "note",
      "reservationId",
      "customerId",
      "createdAt",
    ] as const;
    const csv = rowsToCsv(
      [...headers],
      rows.map((row) => ({
        id: row.original.id,
        amount: row.original.amount,
        type: row.original.type,
        method: row.original.method,
        note: row.original.note ?? "",
        reservationId: row.original.reservationId ?? "",
        customerId: row.original.customerId ?? "",
        createdAt: row.original.createdAt ?? "",
      })),
    );
    downloadCsv("payments-selected.csv", csv);
    table.resetRowSelection();
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={exportSelected}
            aria-label={String(t("dataTable.export.export"))}
          >
            <DownloadIcon className="size-3.5" />
          </Button>
        }
      />
      <TooltipContent>{String(t("dataTable.export.export"))}</TooltipContent>
    </Tooltip>
  );
}
