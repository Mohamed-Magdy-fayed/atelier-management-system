"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MailMinusIcon, MoreHorizontalIcon, Trash2Icon } from "lucide-react";
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
import type { Subscriber } from "@/integrations/trpc/routers/subscribers";

export type SubscriberRowActionVariant = "delete";

export type SetSubscriberRowAction = (
  next: { row: Subscriber; variant: SubscriberRowActionVariant } | null,
) => void;

type Props = { row: Subscriber; setRowAction: SetSubscriberRowAction };

export function SubscriberRowActions({ row, setRowAction }: Props) {
  const { t } = useTranslation();
  const trpc = useTRPC();
  const qc = useQueryClient();

  const unsubscribeMut = useMutation(
    trpc.subscribers.unsubscribe.mutationOptions({
      onSuccess: () => {
        toast.success(String(t("subscribers.unsubscribed")));
        void qc.invalidateQueries(trpc.subscribers.list.queryFilter());
      },
      onError: () => toast.error(String(t("subscribers.unsubscribeFailed"))),
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
        {row.status === "active" && (
          <DropdownMenuItem
            disabled={unsubscribeMut.isPending}
            onClick={() => unsubscribeMut.mutate({ id: row.id })}
          >
            <MailMinusIcon className="size-3.5" />
            {String(t("subscribers.unsubscribe"))}
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
