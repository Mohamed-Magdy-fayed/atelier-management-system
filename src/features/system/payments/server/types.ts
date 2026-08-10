export type PaymentGridRow = {
  id: string;
  branchId: string;
  reservationId: string;
  customerId: string;
  amount: number;
  type: string;
  method: string;
  note: string | null;
  createdAt: Date;
  createdBy: string;
  reservationCode: string;
  totalPrice: number;
  totalPaid: number;
  customerName: string;
  customerPhone: string;
  dressId: string;
  dressTitle: string;
};
