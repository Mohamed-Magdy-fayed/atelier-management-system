"use client";

import { useCallback, useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import { toast } from "sonner";

import { useTranslation } from "@/features/core/i18n/client";
import { formatDate } from "@/lib/format";

import type { ReservationsReceiptProps } from "../../lib/receipt/types";

export function useReservationReceipt(props: ReservationsReceiptProps) {
  const { usagePolicyHint } = props;
  const { t, locale } = useTranslation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const printContainerRef = useRef<HTMLDivElement>(null);

  const labels = {
    cardTitle: String(t("systemPages.reservationsReceiptPreview")),
    printLabel: String(t("systemPages.reservationsPrint")),
    expandLabel: String(t("systemPages.reservationsReceiptExpand")),
    fullTitle: String(t("systemPages.reservationsReservationReceipt")),
    close: String(t("common.close")),
  };

  const formatDateLabel = useCallback(
    (value?: Date | string | null, withTime = true) => {
      if (!value) return String(t("common.inactive"));
      return formatDate(
        value,
        withTime
          ? {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
            }
          : {
              month: "short",
              day: "numeric",
              year: "numeric",
            },
        locale === "ar" ? "ar-EG" : "en-EG",
      );
    },
    [locale, t],
  );

  const handlePrint = useReactToPrint({
    contentRef: printContainerRef,
    documentTitle: labels.fullTitle,
    onBeforePrint: async () => {
      if (printContainerRef.current) {
        printContainerRef.current.dir = locale === "ar" ? "rtl" : "ltr";
      }
    },
    onAfterPrint: () => toast.success(String(t("systemPages.reservationsPrintSuccess"))),
    pageStyle: `
      @page { size: 80mm auto; margin: 5mm; }
      body { font-family: "Times New Roman", Arial, sans-serif; font-size: 16px; line-height: 1.5; font-weight: 500; color: #000; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      body * { visibility: visible !important; color: inherit; }
      .receipt-print { width: 100%; display: flex; flex-direction: column; gap: 12px; }
      .receipt-section { padding-bottom: 10px; border-bottom: 1px dashed black; }
      .receipt-section:last-of-type { border-bottom: none; }
      .receipt-section h5 { margin: 0 0 6px 0; font-weight: 700; letter-spacing: 0.08em; color: black; font-size: 1.1rem; }
      .receipt-section p,
      .receipt-section span { font-size: 1rem; font-weight: 500; color: black; }
      .receipt-section strong { font-weight: 700; }
      img { max-width: 100%; height: auto; }
    `,
  });

  const openFullView = useCallback(() => setIsDialogOpen(true), []);

  return {
    ...props,
    isDialogOpen,
    setIsDialogOpen,
    printContainerRef,
    handlePrint,
    openFullView,
    formatDateLabel,
    labels,
  };
}
