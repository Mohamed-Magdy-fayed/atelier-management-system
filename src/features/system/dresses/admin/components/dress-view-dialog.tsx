"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2Icon } from "lucide-react";
import type { ReactElement } from "react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "@/features/core/i18n/client";
import { useTRPC } from "@/integrations/trpc/client";
import { formatCurrency } from "@/lib/format";

type DressViewDialogProps = {
  dressId: string;
  dressLabel?: string;
  trigger?: ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="font-medium text-sm">{value}</dd>
    </div>
  );
}

function DressViewBody({ dressId, enabled }: { dressId: string; enabled: boolean }) {
  const { t, locale } = useTranslation();
  const trpc = useTRPC();
  const currencyLocale = locale === "ar" ? "ar-EG" : "en-EG";

  const { data: dress, isLoading } = useQuery({
    ...trpc.dresses.getById.queryOptions({ id: dressId }),
    enabled,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-48 items-center justify-center">
        <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!dress) return null;

  const gallery = dress.images?.slice(1) ?? [];
  const dash = "—";
  const fmt = (n: number) => formatCurrency(n, currencyLocale);

  return (
    <>
      <DialogHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
        <DialogTitle className="flex flex-wrap items-center gap-2 text-2xl font-semibold leading-tight">
          {dress.title} — {dress.code}
          <Badge variant={dress.isActive ? "default" : "destructive"}>
            {String(
              t(
                dress.isActive
                  ? "systemPages.dressesActive"
                  : "systemPages.dressesInactive",
              ),
            )}
          </Badge>
        </DialogTitle>
      </DialogHeader>
      <Separator />
      <div className="grid gap-6 pt-4 sm:grid-cols-[minmax(0,260px)_1fr]">
        <div className="space-y-4">
          <div className="aspect-[3/4] overflow-hidden rounded-lg border bg-muted">
            {dress.images?.[0] ? (
              <img
                src={dress.images[0]}
                alt={dress.title}
                className="size-full object-cover"
              />
            ) : (
              <div className="flex size-full items-center justify-center text-muted-foreground text-sm">
                {String(t("systemPages.dressViewNoImage"))}
              </div>
            )}
          </div>
          {gallery.length > 0 ? (
            <div>
              <p className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                {String(t("systemPages.dressViewGallery"))}
              </p>
              <ScrollArea className="mt-2">
                <div className="flex gap-2">
                  {gallery.map((image, index) => (
                    <div
                      key={`${image}-${index}`}
                      className="size-16 overflow-hidden rounded-md border bg-muted"
                    >
                      <img
                        src={image}
                        alt={`${dress.title} ${index + 2}`}
                        className="size-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          ) : null}
        </div>
        <div className="space-y-4">
          <p className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
            {String(t("systemPages.dressViewKeyDetails"))}
          </p>
          <dl className="grid gap-4 sm:grid-cols-2">
            <DetailItem
              label={String(t("systemPages.dressesSize"))}
              value={dress.size ?? dash}
            />
            <DetailItem
              label={String(t("systemPages.dressesColor"))}
              value={dress.color ?? dash}
            />
            <DetailItem
              label={String(t("systemPages.dressesPricePerDay"))}
              value={fmt(dress.pricePerDay)}
            />
            <DetailItem
              label={String(t("systemPages.dressesDepositAmount"))}
              value={fmt(dress.depositAmount)}
            />
            <DetailItem
              label={String(t("systemPages.dressesInsurance"))}
              value={fmt(dress.insurance)}
            />
            <DetailItem
              label={String(t("systemPages.dressesTimesRented"))}
              value={dress.timesRented}
            />
          </dl>
          {dress.description ? (
            <p className="text-muted-foreground text-sm">{dress.description}</p>
          ) : null}
        </div>
      </div>
    </>
  );
}

export function DressViewDialog({
  dressId,
  dressLabel,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: DressViewDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const onOpenChange = controlledOnOpenChange ?? setInternalOpen;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger
        render={
          trigger ?? (
            <button type="button" className="link text-left font-medium">
              {dressLabel ?? dressId}
            </button>
          )
        }
      />
      <DialogContent className="gap-0 sm:max-w-3xl">
        <DressViewBody dressId={dressId} enabled={open} />
      </DialogContent>
    </Dialog>
  );
}
