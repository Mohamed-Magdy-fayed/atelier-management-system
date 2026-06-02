import type { PaymentMethod } from "@/drizzle/schemas/system/payments-table";
import type { ReservationStatus } from "@/drizzle/schemas/system/reservations-table";

export type ReservationsReceiptProps = {
  customer: {
    name: string;
    phone?: string | null;
  };
  totals: {
    basePrice: number;
    discount: number;
    totalDue: number;
    outstanding: number;
    depositPaid: number;
    insurance: number;
  };
  dress?: {
    id: string;
    title?: string | null;
    code?: string | null;
    size?: string | null;
    color?: string | null;
  };
  dates: {
    receiving?: Date | string | null;
    occasion?: Date | string | null;
    returning?: Date | string | null;
  };
  paymentMethod?: PaymentMethod;
  status?: ReservationStatus;
  notes?: string | null;
  usagePolicyHint?: string | null;
  reservationCode?: string | null;
  branchName?: string | null;
};

export type ReceiptVariant = "compact" | "full" | "print";
