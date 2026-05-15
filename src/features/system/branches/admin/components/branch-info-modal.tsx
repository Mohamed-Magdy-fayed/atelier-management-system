"use client";

import Link from "next/link";
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
import { formatBranchHours } from "@/lib/branch-hours";

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

  const mapHref = branch.mapUrl?.trim();
  const hoursLabel = formatBranchHours(branch.opensAt, branch.closesAt, locale);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{String(t("systemPages.branchInfoTitle"))}</DialogTitle>
          <DialogDescription>
            {String(t("systemPages.branchInfoDescription"))}
          </DialogDescription>
        </DialogHeader>
        <div className="divide-y divide-border">
          <InfoRow
            label={String(t("systemPages.branchesNameEn"))}
            value={branch.nameEn}
          />
          <InfoRow
            label={String(t("systemPages.branchesNameAr"))}
            value={branch.nameAr}
          />
          <InfoRow
            label={String(t("systemPages.branchesOwner"))}
            value={branch.ownerName ?? dash}
          />
          <InfoRow
            label={String(t("systemPages.branchesAddressEn"))}
            value={branch.addressEn ?? dash}
          />
          <InfoRow
            label={String(t("systemPages.branchesAddressAr"))}
            value={branch.addressAr ?? dash}
          />
          <InfoRow
            label={String(t("systemPages.branchesPhone"))}
            value={
              branch.phone ? (
                <a
                  className="text-primary underline-offset-4 hover:underline"
                  href={`tel:${branch.phone}`}
                >
                  {branch.phone}
                </a>
              ) : (
                dash
              )
            }
          />
          <InfoRow
            label={String(t("systemPages.branchesHours"))}
            value={hoursLabel ?? dash}
          />
          <InfoRow
            label={String(t("systemPages.branchesMapUrl"))}
            value={
              mapHref ? (
                <Link
                  className="text-primary underline-offset-4 hover:underline"
                  href={mapHref}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {mapHref}
                </Link>
              ) : (
                dash
              )
            }
          />
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
