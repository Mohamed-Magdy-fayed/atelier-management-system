"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  InfoIcon,
  MoreHorizontalIcon,
  PauseCircleIcon,
  PencilIcon,
  PlayCircleIcon,
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
import type { Service } from "@/integrations/trpc/routers/services-mgmt";

export type ServiceRowActionVariant = "info" | "edit" | "delete";

export type SetServiceRowAction = (
  next: { row: Service; variant: ServiceRowActionVariant } | null,
) => void;

type Props = { row: Service; setRowAction: SetServiceRowAction };

export function ServiceRowActions({ row, setRowAction }: Props) {
  const { t } = useTranslation();
  const trpc = useTRPC();
  const qc = useQueryClient();

  const activateMut = useMutation(
    trpc.servicesMgmt.activate.mutationOptions({
      onSuccess: () => {
        toast.success(String(t("services.serviceActivated")));
        void qc.invalidateQueries(trpc.servicesMgmt.list.queryFilter());
      },
    }),
  );
  const deactivateMut = useMutation(
    trpc.servicesMgmt.deactivate.mutationOptions({
      onSuccess: () => {
        toast.success(String(t("services.serviceDeactivated")));
        void qc.invalidateQueries(trpc.servicesMgmt.list.queryFilter());
      },
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
        {row.isActive ? (
          <DropdownMenuItem
            disabled={deactivateMut.isPending}
            onClick={() => deactivateMut.mutate({ id: row.id })}
          >
            <PauseCircleIcon className="size-3.5" />
            {String(t("services.deactivate"))}
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            disabled={activateMut.isPending}
            onClick={() => activateMut.mutate({ id: row.id })}
          >
            <PlayCircleIcon className="size-3.5" />
            {String(t("services.activate"))}
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
