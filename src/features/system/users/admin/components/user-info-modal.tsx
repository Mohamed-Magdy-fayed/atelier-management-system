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
import type { UserGridRow } from "@/integrations/trpc/routers/users";

type UserInfoModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserGridRow | null;
};

function AuditRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[8rem_1fr] items-start gap-2 py-1.5 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="break-words text-foreground">{value}</span>
    </div>
  );
}

export function UserInfoModal({
  open,
  onOpenChange,
  user,
}: UserInfoModalProps) {
  const { t, locale } = useTranslation();

  const dateTimeFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [locale],
  );

  if (!user) return null;

  const dash = "—";
  const fmt = (d: Date | null | undefined) =>
    d ? dateTimeFmt.format(new Date(d)) : dash;

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
          <AuditRow
            label={String(t("dataTable.id"))}
            value={<code className="text-[0.7rem]">{user.id}</code>}
          />
          <AuditRow
            label={String(t("common.createdAt"))}
            value={fmt(user.createdAt)}
          />
          <AuditRow
            label={String(t("common.createdBy"))}
            value={user.createdBy ?? dash}
          />
          <AuditRow
            label={String(t("common.updatedAt"))}
            value={fmt(user.updatedAt)}
          />
          <AuditRow
            label={String(t("common.updatedBy"))}
            value={user.updatedBy ?? dash}
          />
          {user.deletedAt ? (
            <>
              <AuditRow
                label={String(t("common.deletedAt"))}
                value={fmt(user.deletedAt)}
              />
              <AuditRow
                label={String(t("common.deletedBy"))}
                value={user.deletedBy ?? dash}
              />
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
