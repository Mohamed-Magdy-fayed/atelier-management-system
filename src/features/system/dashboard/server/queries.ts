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

import { buildDashboardDateContext, parseDashboardRange } from "../lib/dates";
import type { DashboardData } from "./types";

type Ctx = Awaited<ReturnType<typeof createTRPCContext>>;

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

  const rangeDurationMs = rangeEnd.getTime() - rangeStart.getTime();
  const prevRangeEnd = new Date(rangeStart.getTime() - 1);
  const prevRangeStart = new Date(rangeStart.getTime() - rangeDurationMs);
  const prevRangeStartDate = prevRangeStart.toISOString().slice(0, 10);
  const prevRangeEndDate = prevRangeEnd.toISOString().slice(0, 10);

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

  // DATE-only strings for expenses.date column (Postgres DATE type)
  const currentMonthStartDate = dates.currentMonthStart
    .toISOString()
    .slice(0, 10);
  const currentMonthEndDate = dates.currentMonthEnd.toISOString().slice(0, 10);
  const previousMonthStartDate = dates.previousMonthStart
    .toISOString()
    .slice(0, 10);
  const previousMonthEndDate = dates.previousMonthEnd
    .toISOString()
    .slice(0, 10);
  const rangeStartDate = rangeStart.toISOString().slice(0, 10);
  const rangeEndDate = rangeEnd.toISOString().slice(0, 10);

  // Upcoming occasions window: next 7 days
  const occasionWindowEnd = new Date(dates.todayStart);
  occasionWindowEnd.setDate(occasionWindowEnd.getDate() + 7);

  const reservationsBaseWhere = and(
    isNull(ReservationsTable.deletedAt),
    branchId ? eq(ReservationsTable.branchId, branchId) : undefined,
  );

  const paymentsBaseWhere = and(
    not(eq(PaymentsTable.type, "insurance")),
    branchId ? eq(PaymentsTable.branchId, branchId) : undefined,
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
      .innerJoin(
        ReservationsTable,
        eq(PaymentsTable.reservationId, ReservationsTable.id),
      )
      .where(
        and(
          paymentsBaseWhere,
          isNull(ReservationsTable.deletedAt),
          not(eq(ReservationsTable.status, "cancelled")),
          branchId ? eq(ReservationsTable.branchId, branchId) : undefined,
        ),
      ),

    branchId
      ? ctx.db
          .select({
            activeDresses: sql<number>`COALESCE(SUM(CASE WHEN ${DressesTable.isActive} THEN 1 ELSE 0 END), 0)`,
          })
          .from(DressesTable)
          .where(eq(DressesTable.branchId, branchId))
      : ctx.db
          .select({
            activeDresses: sql<number>`COALESCE(SUM(CASE WHEN ${DressesTable.isActive} THEN 1 ELSE 0 END), 0)`,
          })
          .from(DressesTable),

    branchId
      ? ctx.db
          .select({
            activeCustomers: sql<number>`COALESCE(SUM(CASE WHEN ${RentalCustomersTable.lastReservationAt} IS NOT NULL AND ${RentalCustomersTable.lastReservationAt} >= ${currentMonthStartIso} AND ${RentalCustomersTable.lastReservationAt} <= ${currentMonthEndIso} THEN 1 ELSE 0 END), 0)`,
            customerCount: sql<number>`COUNT(*)`,
          })
          .from(RentalCustomersTable)
          .where(eq(RentalCustomersTable.branchId, branchId))
      : ctx.db
          .select({
            activeCustomers: sql<number>`COALESCE(SUM(CASE WHEN ${RentalCustomersTable.lastReservationAt} IS NOT NULL AND ${RentalCustomersTable.lastReservationAt} >= ${currentMonthStartIso} AND ${RentalCustomersTable.lastReservationAt} <= ${currentMonthEndIso} THEN 1 ELSE 0 END), 0)`,
            customerCount: sql<number>`COUNT(*)`,
          })
          .from(RentalCustomersTable),

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

    branchId
      ? ctx.db
          .select({ paymentsCount: count() })
          .from(PaymentsTable)
          .where(
            and(
              between(
                PaymentsTable.createdAt,
                dates.todayStart,
                dates.todayEnd,
              ),
              eq(PaymentsTable.branchId, branchId),
            ),
          )
      : ctx.db
          .select({ paymentsCount: count() })
          .from(PaymentsTable)
          .where(
            between(PaymentsTable.createdAt, dates.todayStart, dates.todayEnd),
          ),

    branchId
      ? ctx.db
          .select({ totalRevenue: sum(PaymentsTable.amount) })
          .from(PaymentsTable)
          .where(
            and(
              between(PaymentsTable.createdAt, rangeStart, rangeEnd),
              eq(PaymentsTable.branchId, branchId),
              not(eq(PaymentsTable.type, "insurance")),
            ),
          )
      : ctx.db
          .select({ totalRevenue: sum(PaymentsTable.amount) })
          .from(PaymentsTable)
          .where(
            and(
              between(PaymentsTable.createdAt, rangeStart, rangeEnd),
              not(eq(PaymentsTable.type, "insurance")),
            ),
          ),

    branchId
      ? ctx.db
          .select({ reservationsCount: count(ReservationsTable.id) })
          .from(ReservationsTable)
          .where(
            and(
              between(ReservationsTable.createdAt, rangeStart, rangeEnd),
              eq(ReservationsTable.branchId, branchId),
              isNull(ReservationsTable.deletedAt),
            ),
          )
      : ctx.db
          .select({ reservationsCount: count(ReservationsTable.id) })
          .from(ReservationsTable)
          .where(
            and(
              between(ReservationsTable.createdAt, rangeStart, rangeEnd),
              isNull(ReservationsTable.deletedAt),
            ),
          ),

    branchId
      ? ctx.db
          .select({ newCustomers: count() })
          .from(RentalCustomersTable)
          .where(
            and(
              between(RentalCustomersTable.createdAt, rangeStart, rangeEnd),
              eq(RentalCustomersTable.branchId, branchId),
            ),
          )
      : ctx.db
          .select({ newCustomers: count() })
          .from(RentalCustomersTable)
          .where(between(RentalCustomersTable.createdAt, rangeStart, rangeEnd)),

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

    ctx.db.query.ReservationsTable.findMany({
      where: and(
        eq(ReservationsTable.status, "reserved"),
        branchId ? eq(ReservationsTable.branchId, branchId) : undefined,
        lt(ReservationsTable.receivingDateTime, dates.now),
        gt(
          sql`(COALESCE(${ReservationsTable.totalPrice}, 0) - COALESCE(${ReservationsTable.discount}, 0)) - COALESCE(${ReservationsTable.totalPaid}, 0)`,
          0,
        ),
        isNull(ReservationsTable.deletedAt),
      ),
      orderBy: [asc(ReservationsTable.returnDateTime)],
      with: { dress: true },
      limit: 6,
    }),

    ctx.db
      .select({
        count: sql<number>`COUNT(DISTINCT ${ReservationsTable.dressId})`,
      })
      .from(ReservationsTable)
      .where(
        branchId
          ? and(
              eq(ReservationsTable.status, "pickedUp"),
              eq(ReservationsTable.branchId, branchId),
            )
          : eq(ReservationsTable.status, "pickedUp"),
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

    ctx.db.query.RentalCustomersTable.findMany({
      where: branchId ? eq(RentalCustomersTable.branchId, branchId) : undefined,
      orderBy: [desc(RentalCustomersTable.reservationsCount)],
      limit: 6,
    }),

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

    branchId
      ? ctx.db
          .select({
            currentStatus: DressesTable.currentStatus,
            statusCount: count(),
          })
          .from(DressesTable)
          .where(
            and(
              eq(DressesTable.branchId, branchId),
              isNull(DressesTable.deletedAt),
            ),
          )
          .groupBy(DressesTable.currentStatus)
      : ctx.db
          .select({
            currentStatus: DressesTable.currentStatus,
            statusCount: count(),
          })
          .from(DressesTable)
          .where(isNull(DressesTable.deletedAt))
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

    // Previous-period revenue
    branchId
      ? ctx.db
          .select({ totalRevenue: sum(PaymentsTable.amount) })
          .from(PaymentsTable)
          .where(
            and(
              between(PaymentsTable.createdAt, prevRangeStart, prevRangeEnd),
              eq(PaymentsTable.branchId, branchId),
              not(eq(PaymentsTable.type, "insurance")),
            ),
          )
      : ctx.db
          .select({ totalRevenue: sum(PaymentsTable.amount) })
          .from(PaymentsTable)
          .where(
            and(
              between(PaymentsTable.createdAt, prevRangeStart, prevRangeEnd),
              not(eq(PaymentsTable.type, "insurance")),
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
    branchId
      ? ctx.db
          .select({ newCustomers: count() })
          .from(RentalCustomersTable)
          .where(
            and(
              between(
                RentalCustomersTable.createdAt,
                prevRangeStart,
                prevRangeEnd,
              ),
              eq(RentalCustomersTable.branchId, branchId),
            ),
          )
      : ctx.db
          .select({ newCustomers: count() })
          .from(RentalCustomersTable)
          .where(
            between(
              RentalCustomersTable.createdAt,
              prevRangeStart,
              prevRangeEnd,
            ),
          ),

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

    // Payment method breakdown for selected range
    ctx.db
      .select({
        method: PaymentsTable.method,
        amount: sql<number>`COALESCE(SUM(${PaymentsTable.amount}), 0)`,
      })
      .from(PaymentsTable)
      .where(
        and(
          between(PaymentsTable.createdAt, rangeStart, rangeEnd),
          not(eq(PaymentsTable.type, "insurance")),
          branchId ? eq(PaymentsTable.branchId, branchId) : undefined,
        ),
      )
      .groupBy(PaymentsTable.method),
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
    totalOutstanding: outstandingReservations.reduce(
      (acc, row) => acc + row.remaining,
      0,
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
