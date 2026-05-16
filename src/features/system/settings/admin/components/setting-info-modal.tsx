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
import {
  getSettingDisplayDescription,
  getSettingDisplayName,
} from "@/features/system/settings/lib/setting-i18n";
import { SYSTEM_SETTING_CODE } from "@/features/system/settings/lib/system-settings-registry";
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

  const stateLabel =
    setting.isActive === null
      ? dash
      : setting.code === SYSTEM_SETTING_CODE.SHOW_CATALOG_PRICES
        ? String(
            t(
              setting.isActive
                ? "systemPages.settingStatePricesShown"
                : "systemPages.settingStatePricesHidden",
            ),
          )
        : String(
            t(
              setting.isActive
                ? "systemPages.settingsStateEnabled"
                : "systemPages.settingsStateDisabled",
            ),
          );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {String(t("systemPages.settingsInfoTitle"))}
          </DialogTitle>
          <DialogDescription>
            {String(t("systemPages.settingsInfoDescription"))}
          </DialogDescription>
        </DialogHeader>
        <div className="divide-y divide-border">
          <InfoRow
            label={String(t("systemPages.settingsCode"))}
            value={<code className="text-[0.7rem]">{setting.code}</code>}
          />
          <InfoRow
            label={String(t("systemPages.settingsName"))}
            value={getSettingDisplayName(setting.code, t)}
          />
          <InfoRow
            label={String(t("forms.description"))}
            value={getSettingDisplayDescription(setting.code, t)}
          />
          <InfoRow
            label={String(t("systemPages.settingsIsActive"))}
            value={stateLabel}
          />
          <InfoRow
            label={String(t("systemPages.settingsValue"))}
            value={
              setting.value?.trim() ? (
                <span className="whitespace-pre-wrap">{setting.value}</span>
              ) : (
                dash
              )
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
