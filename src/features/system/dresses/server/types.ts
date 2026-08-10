export type DressGridRow = {
  id: string;
  branchId: string;
  code: string;
  title: string;
  description: string | null;
  images: string[] | null;
  size: string | null;
  color: string | null;
  pricePerDay: number;
  depositAmount: number;
  insurance: number;
  timesRented: number;
  lastReservedAt: Date | null;
  /** Payments collected on this dress's bookings, minus expenses booked against it. */
  netValue: number;
  isActive: boolean;
  currentStatus: "available" | "atTailor" | "atDryCleaner" | "underRepair";
  createdAt: Date;
  createdBy: string;
  updatedAt: Date | null;
  updatedBy: string | null;
  deletedAt: Date | null;
  deletedBy: string | null;
};
