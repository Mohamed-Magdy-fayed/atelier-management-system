"use client";

import { useMemo } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslation } from "@/features/core/i18n/client";
import type { BranchGridRow } from "@/integrations/trpc/routers/branches";

type BranchInfoModalProps = {
  branch: BranchGridRow | null;
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] items-start gap-2 py-1.5 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="break-words text-foreground">{value}</span>
    </div>
  );
}

export function BranchInfoModal({
  branch,
  onOpenChange,
  open,
}: BranchInfoModalProps) {
  const { t, locale } = useTranslation();
  const dateTimeFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [locale],
  );

  if (!branch) return null;

  const dash = "—";
  const formatDate = (value: Date | null | undefined) =>
    value ? dateTimeFmt.format(new Date(value)) : dash;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{String(t("systemPages.auditInfoTitle"))}</DialogTitle>
          <DialogDescription>
            {String(t("systemPages.auditInfoDescription"))}
          </DialogDescription>
        </DialogHeader>
        <div className="divide-y divide-border">
          <InfoRow
            label={String(t("dataTable.id"))}
            value={<code className="text-[0.7rem]">{branch.id}</code>}
          />
          <InfoRow
            label={String(t("common.createdAt"))}
            value={formatDate(branch.createdAt)}
          />
          <InfoRow
            label={String(t("common.updatedAt"))}
            value={formatDate(branch.updatedAt)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
