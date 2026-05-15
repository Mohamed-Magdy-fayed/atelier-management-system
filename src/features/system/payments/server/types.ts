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
};
