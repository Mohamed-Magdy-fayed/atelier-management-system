import type { PaymentMethod } from "@/drizzle/schemas/system/payments-table";
import type { ReservationStatus } from "@/drizzle/schemas/system/reservations-table";

import { computeReservationPreview } from "../compute-reservation-preview";
import type { ReservationsReceiptProps } from "./types";

type MapReceiptInput = {
  reservationCode?: string;
  customerName: string;
  customerPhone: string;
  dress?: {
    id: string;
    title: string;
    code: string;
    size?: string | null;
    color?: string | null;
    pricePerDay: number;
    insurance: number;
  } | null;
  receivingDateTime: Date;
  occasionDate: Date;
  returnDateTime: Date;
  discount: number;
  depositPaid: number;
  paymentMethod?: PaymentMethod;
  status?: ReservationStatus;
  notes?: string | null;
  branchName?: string | null;
};

export function mapToReceiptProps(input: MapReceiptInput): ReservationsReceiptProps {
  const totals = computeReservationPreview({
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    dress: input.dress
      ? {
          title: input.dress.title,
          code: input.dress.code,
          pricePerDay: input.dress.pricePerDay,
          insurance: input.dress.insurance,
        }
      : null,
    receivingDateTime: input.receivingDateTime,
    occasionDate: input.occasionDate,
    returnDateTime: input.returnDateTime,
    discount: input.discount,
    depositPaid: input.depositPaid,
  });

  return {
    reservationCode: input.reservationCode,
    branchName: input.branchName,
    customer: {
      name: input.customerName,
      phone: input.customerPhone,
    },
    totals: {
      basePrice: input.dress?.pricePerDay ?? 0,
      discount: totals.discount,
      totalDue: totals.totalPrice,
      outstanding: totals.remainingBalance,
      depositPaid: totals.depositPaid,
      insurance: totals.insurance,
    },
    dress: input.dress
      ? {
          id: input.dress.id,
          title: input.dress.title,
          code: input.dress.code,
          size: input.dress.size,
          color: input.dress.color,
        }
      : undefined,
    dates: {
      receiving: input.receivingDateTime,
      occasion: input.occasionDate,
      returning: input.returnDateTime,
    },
    paymentMethod: input.paymentMethod,
    status: input.status,
    notes: input.notes,
  };
}
