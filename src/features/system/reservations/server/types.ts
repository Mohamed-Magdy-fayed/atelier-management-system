import type { ReservationStatus } from "@/drizzle/schemas/system/reservations-table";

export type ReservationGridRow = {
  id: string;
  branchId: string;
  dressId: string;
  customerId: string;
  reservationCode: string;
  customerName: string;
  customerPhone: string | null;
  receivingDateTime: Date;
  occasionDate: Date;
  returnDateTime: Date;
  totalPrice: number;
  insurance: number;
  discount: number;
  depositPaid: number;
  totalPaid: number;
  remainingBalance: number;
  status: ReservationStatus;
  notes: string | null;
  dressTitle: string;
  dressCode: string;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date | null;
  updatedBy: string | null;
  deletedAt: Date | null;
  deletedBy: string | null;
};

export type ReservationDetailRow = ReservationGridRow & {
  dress: {
    id: string;
    code: string;
    title: string;
    size: string | null;
    color: string | null;
    pricePerDay: number;
    depositAmount: number;
    insurance: number;
    images: string[] | null;
  };
  payments: {
    id: string;
    amount: number;
    method: string;
    type: string;
    createdAt: Date;
  }[];
};
