import type { ReservationStatus } from "@/drizzle/schemas/system/reservations-table";

export type DashboardSummary = {
  totalRevenue: number;
  monthlyRevenue: number;
  monthlyRevenueChange: number | null;
  monthlyExpenses: number;
  monthlyExpensesChange: number | null;
  monthlyNetProfit: number;
  totalReservations: number;
  reservationsThisWeek: number;
  reservationsToday: number;
  reservationsWeekChange: number | null;
  activeReservations: number;
  completedReservations: number;
  upcomingPickups: number;
  overdueReturns: number;
  upcomingBalanceDue: number;
  activeDresses: number;
  dressesAvailable: number;
  dressesAtTailor: number;
  dressesAtDryCleaner: number;
  dressesUnderRepair: number;
  dressUtilizationRate: number | null;
  activeCustomers: number;
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
  timesRented: number | null;
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
  totalOutstanding: number;
  dueTodayReservations: DashboardDueTodayReservation[];
  dressesOutCount: number;
  recentCustomers: DashboardRecentCustomer[];
  upcomingOccasions: DashboardUpcomingOccasion[];
};
