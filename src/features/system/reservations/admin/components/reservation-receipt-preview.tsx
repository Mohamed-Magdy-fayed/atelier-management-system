"use client";

import { ReservationsReceipt } from "@/features/system/reservations/components/receipt/reservations-receipt";
import type { ReservationsReceiptProps } from "@/features/system/reservations/lib/receipt/types";

type ReservationReceiptPreviewProps = {
  preview: ReservationsReceiptProps;
};

export function ReservationReceiptPreview({
  preview,
}: ReservationReceiptPreviewProps) {
  return <ReservationsReceipt {...preview} />;
}
