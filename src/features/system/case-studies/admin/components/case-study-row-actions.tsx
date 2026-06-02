"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArchiveIcon,
  GlobeIcon,
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
import { useTRPC } from "@/integrations/trpc/client";
import type { CaseStudyRow } from "@/integrations/trpc/routers/case-studies";

export type CaseStudyRowActionVariant = "info" | "edit" | "delete";

export type SetCaseStudyRowAction = (
  next: { row: CaseStudyRow; variant: CaseStudyRowActionVariant } | null,
) => void;

type Props = { row: CaseStudyRow; setRowAction: SetCaseStudyRowAction };

export function CaseStudyRowActions({ row, setRowAction }: Props) {
  const { t } = useTranslation();
  const trpc = useTRPC();
  const qc = useQueryClient();

  const publishMut = useMutation(
    trpc.caseStudies.publish.mutationOptions({
      onSuccess: () => {
        toast.success(String(t("work.workPublished")));
        void qc.invalidateQueries(trpc.caseStudies.list.queryFilter());
      },
      onError: () => toast.error(String(t("work.workPublishFailed"))),
    }),
  );

  const archiveMut = useMutation(
    trpc.caseStudies.archive.mutationOptions({
      onSuccess: () => {
        toast.success(String(t("work.workArchived")));
        void qc.invalidateQueries(trpc.caseStudies.list.queryFilter());
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
        {row.status !== "published" && (
          <DropdownMenuItem
            disabled={publishMut.isPending}
            onClick={() => publishMut.mutate({ id: row.id })}
          >
            <GlobeIcon className="size-3.5" />
            {String(t("work.publishWork"))}
          </DropdownMenuItem>
        )}
        {row.status === "published" && (
          <DropdownMenuItem
            disabled={archiveMut.isPending}
            onClick={() => archiveMut.mutate({ id: row.id })}
          >
            <ArchiveIcon className="size-3.5" />
            {String(t("work.archiveWork"))}
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
