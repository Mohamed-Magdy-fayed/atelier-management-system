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
import type { DressGridRow } from "@/integrations/trpc/routers/dresses";

type DressInfoModalProps = {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  dress: DressGridRow | null;
};

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] items-start gap-2 py-1.5 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="break-words text-foreground">{value}</span>
    </div>
  );
}

export function DressInfoModal({
  onOpenChange,
  open,
  dress,
}: DressInfoModalProps) {
  const { t, locale } = useTranslation();
  const dateTimeFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [locale],
  );

  if (!dress) return null;

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
            value={<code className="text-[0.7rem]">{dress.id}</code>}
          />
          <InfoRow
            label={String(t("common.createdAt"))}
            value={formatDate(dress.createdAt)}
          />
          <InfoRow
            label={String(t("common.createdBy"))}
            value={dress.createdBy ?? dash}
          />
          <InfoRow
            label={String(t("common.updatedAt"))}
            value={formatDate(dress.updatedAt)}
          />
          <InfoRow
            label={String(t("common.updatedBy"))}
            value={dress.updatedBy ?? dash}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
