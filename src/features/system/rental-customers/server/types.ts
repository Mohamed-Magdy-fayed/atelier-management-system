export type RentalCustomerGridRow = {
  id: string;
  name: string;
  phone: string;
  reservationsCount: number;
  createdAt: Date;
  lastReservationAt: Date | null;
};
