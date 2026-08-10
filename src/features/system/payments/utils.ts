import type { ComponentProps } from "react";

import type { Badge } from "@/components/ui/badge";
import type {
  PaymentMethod,
  PaymentType,
} from "@/drizzle/schemas/system/payments-table";

export function getPaymentTypeVariant(
  type: PaymentType,
): ComponentProps<typeof Badge>["variant"] {
  switch (type) {
    case "deposit":
      return "outline";
    case "finalPayment":
      return "default";
    case "insurance":
      return "secondary";
    case "penalty":
      return "destructive";
    default:
      return "secondary";
  }
}

export function getPaymentMethodVariant(
  method: PaymentMethod,
): ComponentProps<typeof Badge>["variant"] {
  switch (method) {
    case "cash":
      return "default";
    case "instapay":
      return "secondary";
    case "mobileWallet":
      return "outline";
    case "visa":
      return "destructive";
    default:
      return "secondary";
  }
}
