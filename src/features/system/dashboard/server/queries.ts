import { TRPCError } from "@trpc/server";
import {
  and,
  asc,
  between,
  count,
  desc,
  eq,
  gt,
  gte,
  inArray,
  isNull,
  lt,
  lte,
  not,
  sql,
  sum,
} from "drizzle-orm";
import {
  BranchMembershipsTable,
  DressesTable,
  ExpensesTable,
  PaymentsTable,
  RentalCustomersTable,
  ReservationsTable,
  UsersTable,
} from "@/drizzle/schema";

import {
  assertOperationalStaff,
  resolveListBranchId,
} from "@/features/system/shared/staff-access";
import type { createTRPCContext } from "@/integrations/trpc/init";

import {
  buildDashboardDateContext,
  endOfDay,
  parseDashboardRange,
  startOfDay,
  subDays,
  toLocalDateString,
} from "../lib/dates";
import type { DashboardData } from "./types";

type Ctx = Awaited<ReturnType<typeof createTRPCContext>>;

const MS_PER_DAY = 86_400_000;

function getRequiredSession(ctx: Ctx) {
  if (!ctx.session) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return ctx.session;
}

export type GetDashboardInput = {
  branchId?: string;
  from?: string;
  to?: string;
};

export async function getDashboardData(
  ctx: Ctx,
  input: GetDashboardInput,
): Promise<DashboardData> {
  const session = getRequiredSession(ctx);
  assertOperationalStaff(session.user.role);
  const branchId = await resolveListBranchId(ctx, session, input.branchId);
  const dates = buildDashboardDateContext();
  const { rangeStart, rangeEnd } = parseDashboardRange(input, dates);

  // Previous window spans the same number of whole local days and ends the day
  // before the current window starts, so the two never share a boundary day.
  const rangeDays = Math.max(
    1,
    Math.round((rangeEnd.getTime() - rangeStart.getTime()) / MS_PER_DAY),
  );
  const prevRangeEnd = endOfDay(subDays(rangeStart, 1));
  const prevRangeStart = startOfDay(subDays(rangeStart, rangeDays));
  const prevRangeStartDate = toLocalDateString(prevRangeStart);
  const prevRangeEndDate = toLocalDateString(prevRangeEnd);

  const currentMonthStartIso = dates.currentMonthStart.toISOString();
  const currentMonthEndIso = dates.currentMonthEnd.toISOString();
  const previousMonthStartIso = dates.previousMonthStart.toISOString();
  const previousMonthEndIso = dates.previousMonthEnd.toISOString();
  const currentWeekStartIso = dates.currentWeekStart.toISOString();
  const currentWeekEndIso = dates.currentWeekEnd.toISOString();
  const previousWeekStartIso = dates.previousWeekStart.toISOString();
  const previousWeekEndIso = dates.previousWeekEnd.toISOString();
  const nowIso = dates.now.toISOString();
  const todayStartIso = dates.todayStart.toISOString();
  const todayEndIso = dates.todayEnd.toISOString();
  const upcomingWindowEndIso = dates.upcomingWindowEnd.toISOString();

  // DATE-only strings for the expenses.date column (Postgres DATE type). These
  // must be rendered in the local calendar — see toLocalDateString.
  const currentMonthStartDate = toLocalDateString(dates.currentMonthStart);
  const currentMonthEndDate = toLocalDateString(dates.currentMonthEnd);
  const previousMonthStartDate = toLocalDateString(dates.previousMonthStart);
  const previousMonthEndDate = toLocalDateString(dates.previousMonthEnd);
  const rangeStartDate = toLocalDateString(rangeStart);
  const rangeEndDate = toLocalDateString(rangeEnd);

  // Upcoming occasions window: next 7 days
  const occasionWindowEnd = new Date(dates.todayStart);
  occasionWindowEnd.setDate(occasionWindowEnd.getDate() + 7);

  const reservationsBaseWhere = and(
    isNull(ReservationsTable.deletedAt),
    branchId ? eq(ReservationsTable.branchId, branchId) : undefined,
  );

  /**
   * The single definition of a reservation that counts toward business metrics:
   * alive and not cancelled. Cancelled rows stay in the table for the
   * cancellation-rate numerator only. Every "how many bookings" query must use
   * this — the aggregate and range counts used to disagree.
   */
  const countableReservationWhere = and(
    isNull(ReservationsTable.deletedAt),
    not(eq(ReservationsTable.status, "cancelled")),
    branchId ? eq(ReservationsTable.branchId, branchId) : undefined,
  );

  /**
   * Customers acquired in a range: those whose first reservation *at this scope*
   * falls inside it. Customer rows are tenant-wide and have no branch of their
   * own, so acquisition can only be read off the reservations they generated —
   * which also makes the branch and all-branches views use one definition.
   */
  const newCustomersQuery = (from: Date, to: Date) =>
    ctx.db
      .select({ newCustomers: sql<number>`COUNT(*)` })
      .from(
        ctx.db
          .select({
            customerId: ReservationsTable.customerId,
            firstReservationAt: sql`MIN(${ReservationsTable.createdAt})`.as(
              "first_reservation_at",
            ),
          })
          .from(ReservationsTable)
          .where(reservationsBaseWhere)
          .groupBy(ReservationsTable.customerId)
          .as("customer_first_reservation"),
      )
      .where(sql`first_reservation_at BETWEEN ${from} AND ${to}`);

  const paymentReservationJoin = eq(
    PaymentsTable.reservationId,
    ReservationsTable.id,
  );

  /**
   * The single definition of revenue-bearing money: a non-insurance payment on
   * a countable reservation. Any consumer MUST
   * `.innerJoin(ReservationsTable, paymentReservationJoin)`.
   * `payments.reservationId` is NOT NULL, so the join never drops a valid row.
   */
  const countablePaymentWhere = and(
    not(eq(PaymentsTable.type, "insurance")),
    branchId ? eq(PaymentsTable.branchId, branchId) : undefined,
    isNull(ReservationsTable.deletedAt),
    not(eq(ReservationsTable.status, "cancelled")),
  );

  const remainingBalanceSql = sql`GREATEST((COALESCE(${ReservationsTable.totalPrice}, 0) - COALESCE(${ReservationsTable.discount}, 0)) - COALESCE(${ReservationsTable.totalPaid}, 0), 0)`;

  /** Built per call so each query builder gets its own SQL chunk. */
  const buildOutstandingWhere = () =>
    and(
      eq(ReservationsTable.status, "reserved"),
      lt(ReservationsTable.receivingDateTime, dates.now),
      gt(
        sql`(COALESCE(${ReservationsTable.totalPrice}, 0) - COALESCE(${ReservationsTable.discount}, 0)) - COALESCE(${ReservationsTable.totalPaid}, 0)`,
        0,
      ),
      isNull(ReservationsTable.deletedAt),
      branchId ? eq(ReservationsTable.branchId, branchId) : undefined,
    );

  const employeeWhere = and(
    eq(UsersTable.role, "employee"),
    isNull(UsersTable.deletedAt),
  );

  const [
    reservationsAggregateRow,
    paymentsAggregateRow,
    dressesAggregateRow,
    customerAggregateRow,
    employeeCountRow,
    paymentsCountRow,
    rangeRevenueRow,
    rangeReservationsRow,
    rangeNewCustomersRow,
    topDressesRaw,
    upcomingReservationsRaw,
    outstandingReservationsRaw,
    dressesOutResult,
    dueTodayRaw,
    recentCustomersRaw,
    monthlyExpensesRow,
    rangeExpensesRow,
    dressStatusRaw,
    upcomingOccasionsRaw,
    prevRangeRevenueRow,
    prevRangeExpensesRow,
    prevReservationsCancelRow,
    prevRangeNewCustRow,
    rangeExpensesByTypeRaw,
    rangePaymentsByMethodRaw,
    outstandingTotalsRow,
  ] = await Promise.all([
    ctx.db
      .select({
        totalReservations: sql<number>`COALESCE(SUM(CASE WHEN ${ReservationsTable.status} <> 'cancelled' THEN 1 ELSE 0 END), 0)`,
        activeReservations: sql<number>`COALESCE(SUM(CASE WHEN ${ReservationsTable.status} IN ('reserved', 'pickedUp') THEN 1 ELSE 0 END), 0)`,
        completedReservations: sql<number>`COALESCE(SUM(CASE WHEN ${ReservationsTable.status} = 'returned' THEN 1 ELSE 0 END), 0)`,
        reservationsThisWeek: sql<number>`COALESCE(SUM(CASE WHEN ${ReservationsTable.createdAt} >= ${currentWeekStartIso} AND ${ReservationsTable.createdAt} <= ${currentWeekEndIso} AND ${ReservationsTable.status} <> 'cancelled' THEN 1 ELSE 0 END), 0)`,
        reservationsToday: sql<number>`COALESCE(SUM(CASE WHEN ${ReservationsTable.createdAt} >= ${todayStartIso} AND ${ReservationsTable.createdAt} <= ${todayEndIso} AND ${ReservationsTable.status} <> 'cancelled' THEN 1 ELSE 0 END), 0)`,
        reservationsLastWeek: sql<number>`COALESCE(SUM(CASE WHEN ${ReservationsTable.createdAt} >= ${previousWeekStartIso} AND ${ReservationsTable.createdAt} <= ${previousWeekEndIso} AND ${ReservationsTable.status} <> 'cancelled' THEN 1 ELSE 0 END), 0)`,
        upcomingPickups: sql<number>`COALESCE(SUM(CASE WHEN ${ReservationsTable.receivingDateTime} >= ${nowIso} AND ${ReservationsTable.receivingDateTime} <= ${upcomingWindowEndIso} AND ${ReservationsTable.status} = 'reserved' THEN 1 ELSE 0 END), 0)`,
        overdueReturns: sql<number>`COALESCE(SUM(CASE WHEN ${ReservationsTable.returnDateTime} < ${nowIso} AND ${ReservationsTable.status} = 'pickedUp' THEN 1 ELSE 0 END), 0)`,
        upcomingBalanceDue: sql<number>`COALESCE(SUM(CASE WHEN ${ReservationsTable.receivingDateTime} >= ${nowIso} AND ${ReservationsTable.receivingDateTime} <= ${upcomingWindowEndIso} AND ${ReservationsTable.status} = 'reserved' THEN GREATEST((COALESCE(${ReservationsTable.totalPrice}, 0) - COALESCE(${ReservationsTable.discount}, 0)) - COALESCE(${ReservationsTable.totalPaid}, 0), 0) ELSE 0 END), 0)`,
      })
      .from(ReservationsTable)
      .where(reservationsBaseWhere),

    ctx.db
      .select({
        totalRevenue: sql<number>`COALESCE(SUM(${PaymentsTable.amount}), 0)`,
        monthlyRevenue: sql<number>`COALESCE(SUM(CASE WHEN ${PaymentsTable.createdAt} >= ${currentMonthStartIso} AND ${PaymentsTable.createdAt} <= ${currentMonthEndIso} THEN ${PaymentsTable.amount} ELSE 0 END), 0)`,
        previousMonthlyRevenue: sql<number>`COALESCE(SUM(CASE WHEN ${PaymentsTable.createdAt} >= ${previousMonthStartIso} AND ${PaymentsTable.createdAt} <= ${previousMonthEndIso} THEN ${PaymentsTable.amount} ELSE 0 END), 0)`,
      })
      .from(PaymentsTable)
      .innerJoin(ReservationsTable, paymentReservationJoin)
      .where(
        and(
          countablePaymentWhere,
          branchId ? eq(ReservationsTable.branchId, branchId) : undefined,
        ),
      ),

    // Denominator of dressUtilizationRate — soft-deleted dresses are excluded
    // so the numerator below can never exceed it.
    ctx.db
      .select({
        activeDresses: sql<number>`COALESCE(SUM(CASE WHEN ${DressesTable.isActive} THEN 1 ELSE 0 END), 0)`,
      })
      .from(DressesTable)
      .where(
        and(
          isNull(DressesTable.deletedAt),
          branchId ? eq(DressesTable.branchId, branchId) : undefined,
        ),
      ),

    // Customers are tenant-wide, so a branch's customers are the distinct
    // customers it took reservations for, not rows it owns. Both figures are
    // derived from reservations so the branch and all-branches views share one
    // definition.
    ctx.db
      .select({
        activeCustomers: sql<number>`COUNT(DISTINCT CASE WHEN ${ReservationsTable.createdAt} >= ${currentMonthStartIso} AND ${ReservationsTable.createdAt} <= ${currentMonthEndIso} THEN ${ReservationsTable.customerId} END)`,
        customerCount: sql<number>`COUNT(DISTINCT ${ReservationsTable.customerId})`,
      })
      .from(ReservationsTable)
      .where(reservationsBaseWhere),

    // Not collapsed: the branch arm needs an extra join to resolve membership.
    branchId
      ? ctx.db
          .select({ employeeCount: count() })
          .from(UsersTable)
          .innerJoin(
            BranchMembershipsTable,
            and(
              eq(BranchMembershipsTable.userId, UsersTable.id),
              eq(BranchMembershipsTable.branchId, branchId),
            ),
          )
          .where(employeeWhere)
      : ctx.db
          .select({ employeeCount: count() })
          .from(UsersTable)
          .where(employeeWhere),

    // Intentionally counts every payment taken today, insurance included: this
    // badges a quick action linking to /payments, which lists all payment rows.
    ctx.db
      .select({ paymentsCount: count() })
      .from(PaymentsTable)
      .where(
        and(
          between(PaymentsTable.createdAt, dates.todayStart, dates.todayEnd),
          branchId ? eq(PaymentsTable.branchId, branchId) : undefined,
        ),
      ),

    // Range revenue uses the same rule as lifetime revenue: money attached to a
    // cancelled or soft-deleted reservation is not revenue.
    ctx.db
      .select({ totalRevenue: sum(PaymentsTable.amount) })
      .from(PaymentsTable)
      .innerJoin(ReservationsTable, paymentReservationJoin)
      .where(
        and(
          between(PaymentsTable.createdAt, rangeStart, rangeEnd),
          countablePaymentWhere,
        ),
      ),

    // Same countable definition as reservationsAggregateRow.totalReservations.
    ctx.db
      .select({ reservationsCount: count(ReservationsTable.id) })
      .from(ReservationsTable)
      .where(
        and(
          between(ReservationsTable.createdAt, rangeStart, rangeEnd),
          countableReservationWhere,
        ),
      ),

    newCustomersQuery(rangeStart, rangeEnd),

    ctx.db
      .select({
        id: DressesTable.id,
        code: DressesTable.code,
        title: DressesTable.title,
        isActive: DressesTable.isActive,
        timesRented: DressesTable.timesRented,
        rentals: sql<number>`COALESCE(COUNT(${ReservationsTable.id}), 0)`,
        revenue: sql<number>`COALESCE(SUM(${ReservationsTable.totalPaid}), 0)`,
      })
      .from(DressesTable)
      .leftJoin(
        ReservationsTable,
        and(
          eq(DressesTable.id, ReservationsTable.dressId),
          isNull(ReservationsTable.deletedAt),
          not(eq(ReservationsTable.status, "cancelled")),
          between(ReservationsTable.receivingDateTime, rangeStart, rangeEnd),
        ),
      )
      .where(branchId ? eq(DressesTable.branchId, branchId) : undefined)
      .groupBy(
        DressesTable.id,
        DressesTable.code,
        DressesTable.title,
        DressesTable.isActive,
        DressesTable.timesRented,
      )
      .orderBy(
        sql`COALESCE(COUNT(${ReservationsTable.id}), 0) DESC`,
        sql`COALESCE(SUM(${ReservationsTable.totalPaid}), 0) DESC`,
        sql`${DressesTable.timesRented} DESC`,
        sql`${DressesTable.id} ASC`,
      )
      .limit(5),

    ctx.db.query.ReservationsTable.findMany({
      where: and(
        gte(ReservationsTable.receivingDateTime, dates.now),
        lte(ReservationsTable.receivingDateTime, dates.upcomingWindowEnd),
        eq(ReservationsTable.status, "reserved"),
        isNull(ReservationsTable.deletedAt),
        branchId ? eq(ReservationsTable.branchId, branchId) : undefined,
      ),
      orderBy: [asc(ReservationsTable.receivingDateTime)],
      with: { dress: true },
      limit: 6,
    }),

    // Display list only — capped at 6. The true total comes from
    // outstandingTotalsRow below, which aggregates over every matching row.
    ctx.db.query.ReservationsTable.findMany({
      where: buildOutstandingWhere(),
      orderBy: [asc(ReservationsTable.returnDateTime)],
      with: { dress: true },
      limit: 6,
    }),

    // Numerator of dressUtilizationRate — must be drawn from the same
    // population as activeDresses or the ratio can exceed 100%.
    ctx.db
      .select({
        count: sql<number>`COUNT(DISTINCT ${ReservationsTable.dressId})`,
      })
      .from(ReservationsTable)
      .innerJoin(
        DressesTable,
        and(
          eq(DressesTable.id, ReservationsTable.dressId),
          isNull(DressesTable.deletedAt),
          eq(DressesTable.isActive, true),
        ),
      )
      .where(
        and(
          eq(ReservationsTable.status, "pickedUp"),
          isNull(ReservationsTable.deletedAt),
          branchId ? eq(ReservationsTable.branchId, branchId) : undefined,
        ),
      ),

    ctx.db.query.ReservationsTable.findMany({
      where: and(
        eq(ReservationsTable.status, "pickedUp"),
        gte(ReservationsTable.returnDateTime, dates.todayStart),
        lte(ReservationsTable.returnDateTime, dates.todayEnd),
        isNull(ReservationsTable.deletedAt),
        branchId ? eq(ReservationsTable.branchId, branchId) : undefined,
      ),
      orderBy: [asc(ReservationsTable.returnDateTime)],
      with: { dress: true },
      limit: 8,
    }),

    // Aggregated from reservations rather than read off
    // `rental_customers.reservationsCount`: customers are tenant-wide, so the
    // stored counter is a tenant-wide total and cannot answer "top customers of
    // this branch".
    ctx.db
      .select({
        id: RentalCustomersTable.id,
        name: RentalCustomersTable.name,
        phone: RentalCustomersTable.phone,
        reservationsCount: sql<number>`COUNT(${ReservationsTable.id})`,
        lastReservationAt: sql<Date | null>`MAX(${ReservationsTable.createdAt})`,
      })
      .from(RentalCustomersTable)
      .innerJoin(
        ReservationsTable,
        eq(ReservationsTable.customerId, RentalCustomersTable.id),
      )
      .where(reservationsBaseWhere)
      .groupBy(
        RentalCustomersTable.id,
        RentalCustomersTable.name,
        RentalCustomersTable.phone,
      )
      .orderBy(desc(sql`COUNT(${ReservationsTable.id})`))
      .limit(6),

    ctx.db
      .select({
        monthlyExpenses: sql<number>`COALESCE(SUM(CASE WHEN ${ExpensesTable.date} >= ${currentMonthStartDate} AND ${ExpensesTable.date} <= ${currentMonthEndDate} THEN ${ExpensesTable.amount} ELSE 0 END), 0)`,
        previousMonthExpenses: sql<number>`COALESCE(SUM(CASE WHEN ${ExpensesTable.date} >= ${previousMonthStartDate} AND ${ExpensesTable.date} <= ${previousMonthEndDate} THEN ${ExpensesTable.amount} ELSE 0 END), 0)`,
      })
      .from(ExpensesTable)
      .where(branchId ? eq(ExpensesTable.branchId, branchId) : undefined),

    ctx.db
      .select({ totalExpenses: sum(ExpensesTable.amount) })
      .from(ExpensesTable)
      .where(
        and(
          gte(ExpensesTable.date, rangeStartDate),
          lte(ExpensesTable.date, rangeEndDate),
          branchId ? eq(ExpensesTable.branchId, branchId) : undefined,
        ),
      ),

    ctx.db
      .select({
        currentStatus: DressesTable.currentStatus,
        statusCount: count(),
      })
      .from(DressesTable)
      .where(
        and(
          isNull(DressesTable.deletedAt),
          branchId ? eq(DressesTable.branchId, branchId) : undefined,
        ),
      )
      .groupBy(DressesTable.currentStatus),

    ctx.db.query.ReservationsTable.findMany({
      where: and(
        gte(ReservationsTable.occasionDate, dates.todayStart),
        lte(ReservationsTable.occasionDate, occasionWindowEnd),
        inArray(ReservationsTable.status, ["reserved", "pickedUp"]),
        isNull(ReservationsTable.deletedAt),
        branchId ? eq(ReservationsTable.branchId, branchId) : undefined,
      ),
      orderBy: [asc(ReservationsTable.occasionDate)],
      with: { dress: true },
      limit: 6,
    }),

    // Previous-period revenue — same countable rule as the current range.
    ctx.db
      .select({ totalRevenue: sum(PaymentsTable.amount) })
      .from(PaymentsTable)
      .innerJoin(ReservationsTable, paymentReservationJoin)
      .where(
        and(
          between(PaymentsTable.createdAt, prevRangeStart, prevRangeEnd),
          countablePaymentWhere,
        ),
      ),

    // Previous-period expenses
    ctx.db
      .select({ totalExpenses: sum(ExpensesTable.amount) })
      .from(ExpensesTable)
      .where(
        and(
          gte(ExpensesTable.date, prevRangeStartDate),
          lte(ExpensesTable.date, prevRangeEndDate),
          branchId ? eq(ExpensesTable.branchId, branchId) : undefined,
        ),
      ),

    // Previous-period reservations + current-range cancellations (one round-trip)
    ctx.db
      .select({
        prevReservations: sql<number>`COALESCE(SUM(CASE WHEN ${ReservationsTable.createdAt} >= ${prevRangeStart.toISOString()} AND ${ReservationsTable.createdAt} <= ${prevRangeEnd.toISOString()} AND ${ReservationsTable.status} <> 'cancelled' THEN 1 ELSE 0 END), 0)`,
        cancellations: sql<number>`COALESCE(SUM(CASE WHEN ${ReservationsTable.createdAt} >= ${rangeStart.toISOString()} AND ${ReservationsTable.createdAt} <= ${rangeEnd.toISOString()} AND ${ReservationsTable.status} = 'cancelled' THEN 1 ELSE 0 END), 0)`,
      })
      .from(ReservationsTable)
      .where(
        and(
          isNull(ReservationsTable.deletedAt),
          branchId ? eq(ReservationsTable.branchId, branchId) : undefined,
        ),
      ),

    // Previous-period new customers
    newCustomersQuery(prevRangeStart, prevRangeEnd),

    // Expense breakdown by type for selected range
    ctx.db
      .select({
        type: ExpensesTable.type,
        amount: sql<number>`COALESCE(SUM(${ExpensesTable.amount}), 0)`,
      })
      .from(ExpensesTable)
      .where(
        and(
          gte(ExpensesTable.date, rangeStartDate),
          lte(ExpensesTable.date, rangeEndDate),
          branchId ? eq(ExpensesTable.branchId, branchId) : undefined,
        ),
      )
      .groupBy(ExpensesTable.type),

    // Payment method breakdown for selected range — same countable rule as the
    // revenue KPI, so the breakdown always sums back to it.
    ctx.db
      .select({
        method: PaymentsTable.method,
        amount: sql<number>`COALESCE(SUM(${PaymentsTable.amount}), 0)`,
      })
      .from(PaymentsTable)
      .innerJoin(ReservationsTable, paymentReservationJoin)
      .where(
        and(
          between(PaymentsTable.createdAt, rangeStart, rangeEnd),
          countablePaymentWhere,
        ),
      )
      .groupBy(PaymentsTable.method),

    // Outstanding total must aggregate over ALL matching reservations — the
    // list above is capped at 6 rows purely for display.
    ctx.db
      .select({
        totalOutstanding: sql<number>`COALESCE(SUM(${remainingBalanceSql}), 0)`,
        outstandingCount: count(),
      })
      .from(ReservationsTable)
      .where(buildOutstandingWhere()),
  ]);

  const reservationStats = reservationsAggregateRow[0] ?? {};
  const paymentStats = paymentsAggregateRow[0] ?? {};

  const totalRevenue = Number(paymentStats.totalRevenue ?? 0);
  const monthlyRevenue = Number(paymentStats.monthlyRevenue ?? 0);
  const previousMonthlyRevenue = Number(
    paymentStats.previousMonthlyRevenue ?? 0,
  );
  const reservationsThisWeek = Number(
    reservationStats.reservationsThisWeek ?? 0,
  );
  const reservationsLastWeek = Number(
    reservationStats.reservationsLastWeek ?? 0,
  );

  const monthlyRevenueChange =
    previousMonthlyRevenue > 0
      ? ((monthlyRevenue - previousMonthlyRevenue) / previousMonthlyRevenue) *
        100
      : monthlyRevenue > 0
        ? 100
        : null;

  const reservationsWeekChange =
    reservationsLastWeek > 0
      ? ((reservationsThisWeek - reservationsLastWeek) / reservationsLastWeek) *
        100
      : reservationsThisWeek > 0
        ? 100
        : null;

  const rangeTotalRevenue = Number(rangeRevenueRow[0]?.totalRevenue ?? 0);
  const rangeReservationsCount = Number(
    rangeReservationsRow[0]?.reservationsCount ?? 0,
  );
  const rangeNewCustomers = Number(rangeNewCustomersRow[0]?.newCustomers ?? 0);
  const averageReservationValue =
    rangeReservationsCount > 0
      ? rangeTotalRevenue / rangeReservationsCount
      : null;

  const monthlyExpenses = Number(monthlyExpensesRow[0]?.monthlyExpenses ?? 0);
  const previousMonthExpenses = Number(
    monthlyExpensesRow[0]?.previousMonthExpenses ?? 0,
  );
  const monthlyNetProfit = monthlyRevenue - monthlyExpenses;
  const monthlyExpensesChange =
    previousMonthExpenses > 0
      ? ((monthlyExpenses - previousMonthExpenses) / previousMonthExpenses) *
        100
      : monthlyExpenses > 0
        ? 100
        : null;

  const rangeTotalExpenses = Number(rangeExpensesRow[0]?.totalExpenses ?? 0);
  // KNOWN LIMITATION: revenue is windowed on `payments.createdAt` (the instant
  // the row was inserted) while expenses are windowed on the user-entered
  // `expenses.date` calendar day. There is no payment-date column, so a
  // back-dated payment lands in the period it was recorded, not the period it
  // was received. The UI discloses this under the net-profit card.
  const rangeNetProfit = rangeTotalRevenue - rangeTotalExpenses;

  const prevRevenue = Number(prevRangeRevenueRow[0]?.totalRevenue ?? 0);
  const prevExpenses = Number(prevRangeExpensesRow[0]?.totalExpenses ?? 0);
  const prevReservations = Number(
    prevReservationsCancelRow[0]?.prevReservations ?? 0,
  );
  const prevNewCustomers = Number(prevRangeNewCustRow[0]?.newCustomers ?? 0);
  const cancellations = Number(
    prevReservationsCancelRow[0]?.cancellations ?? 0,
  );
  // rangeReservationsCount excludes cancelled rows and `cancellations` counts
  // exactly the cancelled rows created in the same window, so the sum is the
  // true number of reservations booked in the period. Do not drop either term.
  const totalForRate = rangeReservationsCount + cancellations;
  const cancellationRate =
    totalForRate > 0 ? (cancellations / totalForRate) * 100 : null;

  const dressStatusMap = Object.fromEntries(
    dressStatusRaw.map((row) => [row.currentStatus, Number(row.statusCount)]),
  );
  const activeDresses = Number(dressesAggregateRow[0]?.activeDresses ?? 0);
  const dressesOutCount = Number(dressesOutResult[0]?.count ?? 0);
  const dressUtilizationRate =
    activeDresses > 0 ? (dressesOutCount / activeDresses) * 100 : null;

  const outstandingReservations = outstandingReservationsRaw.map(
    (reservation) => {
      const totalDue =
        Number(reservation.totalPrice ?? 0) - Number(reservation.discount ?? 0);
      const remaining = Math.max(
        totalDue - Number(reservation.totalPaid ?? 0),
        0,
      );
      return {
        id: String(reservation.id),
        reservationCode: reservation.reservationCode,
        customerName: reservation.customerName,
        dressId: String(reservation.dressId),
        dressTitle: reservation.dress?.title ?? "—",
        dueDate: new Date(reservation.receivingDateTime).toISOString(),
        remaining,
        status: reservation.status,
      };
    },
  );

  return {
    summary: {
      totalRevenue,
      monthlyRevenue,
      monthlyRevenueChange,
      monthlyExpenses,
      monthlyExpensesChange,
      monthlyNetProfit,
      totalReservations: Number(reservationStats.totalReservations ?? 0),
      reservationsThisWeek,
      reservationsToday: Number(reservationStats.reservationsToday ?? 0),
      reservationsWeekChange,
      activeReservations: Number(reservationStats.activeReservations ?? 0),
      completedReservations: Number(
        reservationStats.completedReservations ?? 0,
      ),
      upcomingPickups: Number(reservationStats.upcomingPickups ?? 0),
      overdueReturns: Number(reservationStats.overdueReturns ?? 0),
      upcomingBalanceDue: Number(reservationStats.upcomingBalanceDue ?? 0),
      activeDresses,
      dressesAvailable: dressStatusMap.available ?? 0,
      dressesAtTailor: dressStatusMap.atTailor ?? 0,
      dressesAtDryCleaner: dressStatusMap.atDryCleaner ?? 0,
      dressesUnderRepair: dressStatusMap.underRepair ?? 0,
      dressUtilizationRate,
      activeCustomers: Number(customerAggregateRow[0]?.activeCustomers ?? 0),
      customerCount: Number(customerAggregateRow[0]?.customerCount ?? 0),
      employeeCount: Number(employeeCountRow[0]?.employeeCount ?? 0),
      paymentsCount: Number(paymentsCountRow[0]?.paymentsCount ?? 0),
    },
    rangeStats: {
      from: rangeStart.toISOString(),
      to: rangeEnd.toISOString(),
      totalRevenue: rangeTotalRevenue,
      totalExpenses: rangeTotalExpenses,
      netProfit: rangeNetProfit,
      reservationsCount: rangeReservationsCount,
      newCustomers: rangeNewCustomers,
      averageReservationValue,
      prevRevenue,
      prevExpenses,
      prevReservations,
      prevNewCustomers,
      cancellations,
      cancellationRate,
      expensesByType: rangeExpensesByTypeRaw.map((r) => ({
        type: r.type,
        amount: Number(r.amount),
      })),
      paymentsByMethod: rangePaymentsByMethodRaw.map((r) => ({
        method: r.method,
        amount: Number(r.amount),
      })),
    },
    topDresses: topDressesRaw.map((row) => ({
      id: String(row.id),
      code: row.code ?? "",
      title: row.title ?? "",
      isActive: Boolean(row.isActive),
      rentals: Number(row.rentals ?? 0),
      revenue: Number(row.revenue ?? 0),
      timesRented: row.timesRented ?? 0,
    })),
    upcomingReservations: upcomingReservationsRaw.map((reservation) => ({
      id: String(reservation.id),
      reservationCode: reservation.reservationCode,
      dressId: String(reservation.dressId),
      dressTitle: reservation.dress?.title ?? "—",
      customerName: reservation.customerName,
      receivingDateTime: new Date(reservation.receivingDateTime).toISOString(),
      employee: reservation.createdBy,
    })),
    outstandingReservations,
    totalOutstanding: Number(outstandingTotalsRow[0]?.totalOutstanding ?? 0),
    totalOutstandingCount: Number(
      outstandingTotalsRow[0]?.outstandingCount ?? 0,
    ),
    dressesOutCount,
    dueTodayReservations: dueTodayRaw.map((reservation) => ({
      id: String(reservation.id),
      reservationCode: reservation.reservationCode,
      dressId: String(reservation.dressId),
      dressTitle: reservation.dress?.title ?? "—",
      customerName: reservation.customerName,
      returnDateTime: new Date(reservation.returnDateTime).toISOString(),
    })),
    recentCustomers: recentCustomersRaw.map((customer) => ({
      id: String(customer.id),
      name: customer.name,
      phone: customer.phone,
      reservationsCount: customer.reservationsCount ?? 0,
      lastReservationAt: customer.lastReservationAt
        ? new Date(customer.lastReservationAt).toISOString()
        : null,
    })),
    upcomingOccasions: upcomingOccasionsRaw.map((reservation) => ({
      id: String(reservation.id),
      reservationCode: reservation.reservationCode,
      customerName: reservation.customerName,
      dressTitle: reservation.dress?.title ?? "—",
      occasionDate: new Date(reservation.occasionDate).toISOString(),
      status: reservation.status,
    })),
  };
}
