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
import type { SettingGridRow } from "@/integrations/trpc/routers/settings";

type SettingInfoModalProps = {
  setting: SettingGridRow | null;
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

function settingsLabelTranslationId(label: string) {
  switch (label) {
    case "policy":
      return "systemPages.settingsLabelPolicy" as const;
    case "integration":
      return "systemPages.settingsLabelIntegration" as const;
    default:
      return "systemPages.settingsCategory";
  }
}

export function SettingInfoModal({
  setting,
  onOpenChange,
  open,
}: SettingInfoModalProps) {
  const { t, locale } = useTranslation();
  const dateTimeFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [locale],
  );

  if (!setting) return null;

  const dash = "—";
  const formatDate = (value: Date | null | undefined) =>
    value ? dateTimeFmt.format(new Date(value)) : dash;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{String(t("systemPages.settingsInfoTitle"))}</DialogTitle>
          <DialogDescription>
            {String(t("systemPages.settingsInfoDescription"))}
          </DialogDescription>
        </DialogHeader>
        <div className="divide-y divide-border">
          <InfoRow
            label={String(t("dataTable.id"))}
            value={<code className="text-[0.7rem]">{setting.id}</code>}
          />
          <InfoRow label={String(t("systemPages.settingsCode"))} value={setting.code} />
          <InfoRow
            label={String(t("systemPages.settingsCategory"))}
            value={String(t(settingsLabelTranslationId(setting.label)))}
          />
          <InfoRow
            label={String(t("forms.description"))}
            value={setting.description ?? dash}
          />
          <InfoRow
            label={String(t("systemPages.settingsValue"))}
            value={setting.value ?? dash}
          />
          <InfoRow
            label={String(t("systemPages.settingsAmount"))}
            value={
              setting.amount != null
                ? String(setting.amount)
                : dash
            }
          />
          <InfoRow
            label={String(t("common.createdAt"))}
            value={formatDate(setting.createdAt)}
          />
          <InfoRow
            label={String(t("common.updatedAt"))}
            value={formatDate(setting.updatedAt)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
