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
import type { ProductGridRow } from "@/integrations/trpc/routers/products";

type ProductInfoModalProps = {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  product: ProductGridRow | null;
};

function InfoRow({
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

export function ProductInfoModal({
  onOpenChange,
  open,
  product,
}: ProductInfoModalProps) {
  const { t, locale } = useTranslation();
  const dateTimeFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [locale],
  );
  const moneyFmt = useMemo(
    () =>
      new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-EG", {
        style: "currency",
        currency: "EGP",
      }),
    [locale],
  );

  if (!product) return null;

  const dash = "—";
  const formatDate = (value: Date | null | undefined) =>
    value ? dateTimeFmt.format(new Date(value)) : dash;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{String(t("systemPages.productInfoTitle"))}</DialogTitle>
          <DialogDescription>
            {String(t("systemPages.productInfoDescription"))}
          </DialogDescription>
        </DialogHeader>
        <div className="divide-y divide-border">
          <InfoRow
            label={String(t("dataTable.id"))}
            value={<code className="text-[0.7rem]">{product.id}</code>}
          />
          <InfoRow
            label={String(t("systemPages.productsCode"))}
            value={<code>{product.code}</code>}
          />
          <InfoRow
            label={String(t("systemPages.productsNameEn"))}
            value={product.nameEn}
          />
          <InfoRow
            label={String(t("systemPages.productsNameAr"))}
            value={product.nameAr}
          />
          <InfoRow
            label={String(t("systemPages.productsPrice"))}
            value={moneyFmt.format(product.price)}
          />
          <InfoRow
            label={String(t("systemPages.productsStatus"))}
            value={product.isActive ? t("common.active") : t("common.inactive")}
          />
          <InfoRow
            label={String(t("common.createdAt"))}
            value={formatDate(product.createdAt)}
          />
          <InfoRow
            label={String(t("common.createdBy"))}
            value={product.createdBy ?? dash}
          />
          <InfoRow
            label={String(t("common.updatedAt"))}
            value={formatDate(product.updatedAt)}
          />
          <InfoRow
            label={String(t("common.updatedBy"))}
            value={product.updatedBy ?? dash}
          />
          {product.deletedAt ? (
            <>
              <InfoRow
                label={String(t("common.deletedAt"))}
                value={formatDate(product.deletedAt)}
              />
              <InfoRow
                label={String(t("common.deletedBy"))}
                value={product.deletedBy ?? dash}
              />
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
