export type RentalCustomerGridRow = {
  id: string;
  name: string;
  phone: string;
  /** Selected but not shown as a column — the edit dialog prefills from it. */
  note: string | null;
  reservationsCount: number;
  createdAt: Date;
  lastReservationAt: Date | null;
};
