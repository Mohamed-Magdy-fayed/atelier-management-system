import type { ComponentProps } from "react";

import { Badge } from "@/components/ui/badge";
import type { PaymentMethod } from "@/drizzle/schemas/system/payments-table";
import type { ReservationStatus } from "@/drizzle/schemas/system/reservations-table";
import { getInitials } from "@/features/core/auth/core/helpers";

export function generateReservationCode(
  todayCount: number,
  branchName: string,
): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const count = String(todayCount + 1).padStart(3, "0");

  return `RES-${getInitials(branchName)}-${year}${month}${day}-${count}`;
}

export function getStatusVariant(
  status: ReservationStatus,
): ComponentProps<typeof Badge>["variant"] {
  switch (status) {
    case "reserved":
      return "default";
    case "cancelled":
      return "destructive";
    case "pickedUp":
      return "outline";
    default:
      return "secondary";
  }
}

export function formatPaymentMethod(method: PaymentMethod) {
  switch (method) {
    case "cash":
      return "Cash";
    case "instapay":
      return "Instapay";
    case "mobileWallet":
      return "Mobile wallet";
    case "visa":
      return "Visa";
    default:
      return method;
  }
}

export function reservationOutstanding(row: {
  totalPrice: number;
  discount: number;
  totalPaid: number;
}) {
  return row.totalPrice - row.discount - row.totalPaid;
}
