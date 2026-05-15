import {
  and,
  asc,
  between,
  count,
  desc,
  eq,
  gt,
  gte,
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
  PaymentsTable,
  RentalCustomersTable,
  ReservationsTable,
  UsersTable,
} from "@/drizzle/schema";
import type { createTRPCContext } from "@/integrations/trpc/init";

import {
  buildDashboardDateContext,
  parseDashboardRange,
} from "../lib/dates";
import type { DashboardData } from "./types";

type Ctx = Awaited<ReturnType<typeof createTRPCContext>>;

export type GetDashboardInput = {
  branchId?: string;
  from?: string;
  to?: string;
};

export async function getDashboardData(
  ctx: Ctx,
  input: GetDashboardInput,
): Promise<DashboardData> {
  const branchId = input.branchId;
  const dates = buildDashboardDateContext();
  const { rangeStart, rangeEnd } = parseDashboardRange(input, dates);

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
            between(
              PaymentsTable.createdAt,
              dates.todayStart,
              dates.todayEnd,
            ),
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
      where: branchId
        ? eq(RentalCustomersTable.branchId, branchId)
        : undefined,
      orderBy: [desc(RentalCustomersTable.reservationsCount)],
      limit: 6,
    }),
  ]);

  const reservationStats = reservationsAggregateRow[0] ?? {};
  const paymentStats = paymentsAggregateRow[0] ?? {};

  const totalRevenue = Number(paymentStats.totalRevenue ?? 0);
  const monthlyRevenue = Number(paymentStats.monthlyRevenue ?? 0);
  const previousMonthlyRevenue = Number(paymentStats.previousMonthlyRevenue ?? 0);
  const reservationsThisWeek = Number(reservationStats.reservationsThisWeek ?? 0);
  const reservationsLastWeek = Number(reservationStats.reservationsLastWeek ?? 0);

  const monthlyRevenueChange =
    previousMonthlyRevenue > 0
      ? ((monthlyRevenue - previousMonthlyRevenue) / previousMonthlyRevenue) * 100
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

  const outstandingReservations = outstandingReservationsRaw.map(
    (reservation) => {
      const totalDue =
        Number(reservation.totalPrice ?? 0) -
        Number(reservation.discount ?? 0);
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
      activeDresses: Number(dressesAggregateRow[0]?.activeDresses ?? 0),
      activeCustomers: Number(customerAggregateRow[0]?.activeCustomers ?? 0),
      customerCount: Number(customerAggregateRow[0]?.customerCount ?? 0),
      employeeCount: Number(employeeCountRow[0]?.employeeCount ?? 0),
      paymentsCount: Number(paymentsCountRow[0]?.paymentsCount ?? 0),
    },
    rangeStats: {
      from: rangeStart.toISOString(),
      to: rangeEnd.toISOString(),
      totalRevenue: rangeTotalRevenue,
      reservationsCount: rangeReservationsCount,
      newCustomers: rangeNewCustomers,
      averageReservationValue,
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
      receivingDateTime: new Date(
        reservation.receivingDateTime,
      ).toISOString(),
      employee: reservation.createdBy,
    })),
    outstandingReservations,
    totalOutstanding: outstandingReservations.reduce(
      (acc, row) => acc + row.remaining,
      0,
    ),
    dressesOutCount: Number(dressesOutResult[0]?.count ?? 0),
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
  };
}
