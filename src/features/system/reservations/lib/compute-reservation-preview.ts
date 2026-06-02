export type ReservationPreviewDress = {
  title: string;
  code: string;
  pricePerDay: number;
  insurance: number;
};

export type ReservationPreviewInput = {
  reservationCode?: string;
  customerName: string;
  customerPhone: string;
  dress: ReservationPreviewDress | null;
  receivingDateTime: Date;
  occasionDate: Date;
  returnDateTime: Date;
  totalPrice?: number;
  discount: number;
  depositPaid: number;
  totalPaid?: number;
};

export type ReservationPreviewTotals = {
  totalPrice: number;
  insurance: number;
  discount: number;
  depositPaid: number;
  totalPaid: number;
  remainingBalance: number;
};

export function computeReservationPreview(
  input: ReservationPreviewInput,
): ReservationPreviewTotals {
  const totalPrice = input.totalPrice ?? input.dress?.pricePerDay ?? 0;
  const insurance = input.dress?.insurance ?? 0;
  const discount = Math.max(0, input.discount);
  const depositPaid = Math.max(0, input.depositPaid);
  const totalPaid = input.totalPaid ?? depositPaid;
  const remainingBalance = Math.max(0, totalPrice - discount - totalPaid);

  return {
    totalPrice,
    insurance,
    discount,
    depositPaid,
    totalPaid,
    remainingBalance,
  };
}
