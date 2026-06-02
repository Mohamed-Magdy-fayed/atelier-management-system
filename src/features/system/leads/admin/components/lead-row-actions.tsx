"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircleIcon,
  InfoIcon,
  MoreHorizontalIcon,
  PhoneIcon,
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
import type { Lead } from "@/integrations/trpc/routers/leads";

export type LeadRowActionVariant = "info" | "delete";

export type SetLeadRowAction = (
  next: { row: Lead; variant: LeadRowActionVariant } | null,
) => void;

type Props = { row: Lead; setRowAction: SetLeadRowAction };

export function LeadRowActions({ row, setRowAction }: Props) {
  const { t } = useTranslation();
  const trpc = useTRPC();
  const qc = useQueryClient();

  const updateStatus = useMutation(
    trpc.leads.updateStatus.mutationOptions({
      onSuccess: () => {
        toast.success(String(t("leads.statusUpdated")));
        void qc.invalidateQueries(trpc.leads.list.queryFilter());
      },
      onError: () => toast.error(String(t("leads.statusUpdateFailed"))),
    }),
  );

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
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          onClick={() => setRowAction({ row, variant: "info" })}
        >
          <InfoIcon className="size-3.5" />
          {String(t("common.info"))}
        </DropdownMenuItem>
        {row.status === "new" && (
          <DropdownMenuItem
            disabled={updateStatus.isPending}
            onClick={() =>
              updateStatus.mutate({ id: row.id, status: "contacted" })
            }
          >
            <PhoneIcon className="size-3.5" />
            {String(t("leads.markContacted"))}
          </DropdownMenuItem>
        )}
        {row.status === "contacted" && (
          <DropdownMenuItem
            disabled={updateStatus.isPending}
            onClick={() =>
              updateStatus.mutate({ id: row.id, status: "qualified" })
            }
          >
            <CheckCircleIcon className="size-3.5" />
            {String(t("leads.markQualified"))}
          </DropdownMenuItem>
        )}
        {(row.status === "qualified" || row.status === "contacted") && (
          <DropdownMenuItem
            disabled={updateStatus.isPending}
            onClick={() =>
              updateStatus.mutate({ id: row.id, status: "closed" })
            }
          >
            <CheckCircleIcon className="size-3.5 opacity-50" />
            {String(t("leads.close"))}
          </DropdownMenuItem>
        )}
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
