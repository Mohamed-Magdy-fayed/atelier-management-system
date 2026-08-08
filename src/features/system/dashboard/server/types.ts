import type { ReservationStatus } from "@/drizzle/schemas/system/reservations-table";

/**
 * Live counts, unaffected by the selected date range. Every field here is
 * rendered — nothing is computed for a consumer that does not exist.
 */
export type DashboardSummary = {
  activeReservations: number;
  completedReservations: number;
  upcomingPickups: number;
  overdueReturns: number;
  /** Rentable portfolio: not soft-deleted and still active. */
  activeDresses: number;
  /**
   * The four buckets below partition `activeDresses`: a dress out on a rental
   * counts as out regardless of its stored maintenance status.
   * `dressesOut + dressesAvailable + atTailor + atDryCleaner + underRepair
   * === activeDresses`.
   */
  dressesOut: number;
  dressesAvailable: number;
  dressesAtTailor: number;
  dressesAtDryCleaner: number;
  dressesUnderRepair: number;
  /** `dressesOut / activeDresses` as a percentage; null when nothing is rentable. */
  dressUtilizationRate: number | null;
  customerCount: number;
  employeeCount: number;
  paymentsCount: number;
};

export type DashboardRangeStats = {
  from: string;
  to: string;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  reservationsCount: number;
  newCustomers: number;
  averageReservationValue: number | null;
  prevRevenue: number;
  prevExpenses: number;
  prevReservations: number;
  prevNewCustomers: number;
  cancellations: number;
  cancellationRate: number | null;
  expensesByType: Array<{ type: string; amount: number }>;
  paymentsByMethod: Array<{ method: string; amount: number }>;
};

export type DashboardUpcomingReservation = {
  id: string;
  reservationCode: string;
  dressId: string;
  dressTitle: string;
  customerName: string;
  receivingDateTime: string;
  employee: string | null;
};

export type DashboardOutstandingReservation = {
  id: string;
  reservationCode: string;
  customerName: string;
  dressId: string;
  dressTitle: string;
  dueDate: string;
  remaining: number;
  status: ReservationStatus;
};

export type DashboardTopDress = {
  id: string;
  code: string;
  title: string;
  isActive: boolean;
  rentals: number;
  revenue: number;
};

export type DashboardDueTodayReservation = {
  id: string;
  reservationCode: string;
  dressId: string;
  dressTitle: string;
  customerName: string;
  returnDateTime: string;
};

export type DashboardRecentCustomer = {
  id: string;
  name: string;
  phone: string;
  reservationsCount: number;
  lastReservationAt: string | null;
};

export type DashboardUpcomingOccasion = {
  id: string;
  reservationCode: string;
  customerName: string;
  dressTitle: string;
  occasionDate: string;
  status: ReservationStatus;
};

export type DashboardData = {
  summary: DashboardSummary;
  rangeStats: DashboardRangeStats;
  topDresses: DashboardTopDress[];
  upcomingReservations: DashboardUpcomingReservation[];
  outstandingReservations: DashboardOutstandingReservation[];
  /** Every unpaid remainder on a live, non-cancelled reservation. */
  totalOutstanding: number;
  /** Reservations behind `totalOutstanding` — the list above is capped at 6. */
  totalOutstandingCount: number;
  /** Subset of `totalOutstanding` whose due date has already passed. */
  overdueOutstanding: number;
  overdueOutstandingCount: number;
  dueTodayReservations: DashboardDueTodayReservation[];
  recentCustomers: DashboardRecentCustomer[];
  upcomingOccasions: DashboardUpcomingOccasion[];
};
