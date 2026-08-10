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
  balanceDueDateSql,
  countableReservation,
  dressIsOutNow,
  liveReservation,
  OWING_STATUSES,
  remainingBalanceSql,
} from "@/features/system/shared/reservation-scope";
import {
  assertOperationalStaff,
  resolveListBranchId,
} from "@/features/system/shared/staff-access";
import type { createTRPCContext } from "@/integrations/trpc/init";

import {
  buildDashboardDateContext,
  parseDashboardRange,
  toLocalDateString,
} from "../lib/dates";
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

  // Previous window is the equally long span immediately preceding this one,
  // derived by pure arithmetic on the instants. It deliberately does NOT re-floor
  // to a calendar day: `rangeStart`/`rangeEnd` already carry the viewer's day
  // boundaries, and re-flooring them would re-anchor the comparison to the
  // server's calendar (UTC in production) and stretch it past a full period.
  // Ending 1ms before `rangeStart` keeps the two windows adjacent but disjoint.
  const rangeSpanMs = rangeEnd.getTime() - rangeStart.getTime();
  const prevRangeEnd = new Date(rangeStart.getTime() - 1);
  const prevRangeStart = new Date(prevRangeEnd.getTime() - rangeSpanMs);
  const prevRangeStartDate = toLocalDateString(prevRangeStart);
  const prevRangeEndDate = toLocalDateString(prevRangeEnd);

  const nowIso = dates.now.toISOString();
  const upcomingWindowEndIso = dates.upcomingWindowEnd.toISOString();

  // DATE-only strings for the expenses.date column (Postgres DATE type). These
  // must be rendered in the local calendar — see toLocalDateString.
  const rangeStartDate = toLocalDateString(rangeStart);
  const rangeEndDate = toLocalDateString(rangeEnd);

  // Upcoming occasions window: next 7 days
  const occasionWindowEnd = new Date(dates.todayStart);
  occasionWindowEnd.setDate(occasionWindowEnd.getDate() + 7);

  // Both predicates live in shared/reservation-scope.ts so the dashboard, the
  // reservation list and the booking-conflict check cannot drift apart.
  const reservationsBaseWhere = liveReservation(branchId);
  const countableReservationWhere = countableReservation(branchId);

  /**
   * Customers acquired in a range: those whose first *countable* reservation at
   * this scope falls inside it. Customer rows are tenant-wide and have no branch
   * of their own, so acquisition can only be read off the reservations they
   * generated — which also makes the branch and all-branches views use one
   * definition. A cancelled booking never acquired anyone.
   *
   * The bounds are bound as ISO strings with an explicit cast, never as Date
   * objects: `first_reservation_at` is a subquery alias, so Postgres reports the
   * parameter type back as unknown and postgres.js then tries to serialize the
   * Date as text and throws. Typecheck and build cannot see this — only running
   * the query can.
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
          .where(countableReservation(branchId))
          .groupBy(ReservationsTable.customerId)
          .as("customer_first_reservation"),
      )
      .where(
        sql`first_reservation_at BETWEEN ${from.toISOString()}::timestamptz AND ${to.toISOString()}::timestamptz`,
      );

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

  /**
   * Every reservation that still owes money — not only those past their pickup
   * date. "Outstanding balance" is read as total receivables, so a picked-up or
   * returned rental with an unpaid remainder belongs here too.
   *
   * Built per call so each query builder gets its own SQL chunk.
   */
  const buildOutstandingWhere = () =>
    and(
      countableReservation(branchId),
      inArray(ReservationsTable.status, [...OWING_STATUSES]),
      gt(
        sql`(COALESCE(${ReservationsTable.totalPrice}, 0) - COALESCE(${ReservationsTable.discount}, 0)) - COALESCE(${ReservationsTable.totalPaid}, 0)`,
        0,
      ),
    );

  const employeeWhere = and(
    eq(UsersTable.role, "employee"),
    isNull(UsersTable.deletedAt),
  );

  /**
   * Branch scoping for tenant-wide customer rows, identical to the predicate
   * behind the /rental-customers grid total (rental-customers/server/filters.ts)
   * so the quick-action badge and the page it links to cannot disagree.
   */
  const customerBranchWhere = branchId
    ? sql`EXISTS (
        SELECT 1 FROM ${ReservationsTable}
        WHERE ${ReservationsTable.customerId} = ${RentalCustomersTable.id}
          AND ${ReservationsTable.branchId} = ${branchId}
          AND ${ReservationsTable.deletedAt} IS NULL
      )`
    : undefined;

  const [
    reservationsAggregateRow,
    dressPortfolioRow,
    customerCountRow,
    employeeCountRow,
    paymentsCountRow,
    rangeRevenueRow,
    rangeReservationsRow,
    rangeNewCustomersRow,
    topDressesRaw,
    upcomingReservationsRaw,
    outstandingReservationsRaw,
    dueTodayRaw,
    recentCustomersRaw,
    rangeExpensesRow,
    upcomingOccasionsRaw,
    prevRangeRevenueRow,
    prevRangeExpensesRow,
    prevReservationsCancelRow,
    prevRangeNewCustRow,
    rangeExpensesByTypeRaw,
    rangePaymentsByMethodRaw,
    outstandingTotalsRow,
  ] = await Promise.all([
    // Live operational counts. Each arm already filters on a status that
    // excludes cancelled; the base predicate states it rather than implying it.
    ctx.db
      .select({
        activeReservations: sql<number>`COALESCE(SUM(CASE WHEN ${ReservationsTable.status} IN ('reserved', 'pickedUp') THEN 1 ELSE 0 END), 0)`,
        completedReservations: sql<number>`COALESCE(SUM(CASE WHEN ${ReservationsTable.status} = 'returned' THEN 1 ELSE 0 END), 0)`,
        upcomingPickups: sql<number>`COALESCE(SUM(CASE WHEN ${ReservationsTable.receivingDateTime} >= ${nowIso} AND ${ReservationsTable.receivingDateTime} <= ${upcomingWindowEndIso} AND ${ReservationsTable.status} = 'reserved' THEN 1 ELSE 0 END), 0)`,
        overdueReturns: sql<number>`COALESCE(SUM(CASE WHEN ${ReservationsTable.returnDateTime} < ${nowIso} AND ${ReservationsTable.status} = 'pickedUp' THEN 1 ELSE 0 END), 0)`,
      })
      .from(ReservationsTable)
      .where(countableReservationWhere),

    /**
     * One pass over the rentable portfolio, putting every dress in exactly one
     * bucket so the tiles sum to `activeDresses`.
     *
     * `dresses.currentStatus` is a MAINTENANCE flag — nothing in the reservation
     * lifecycle writes it, so on its own it reports a dress that left with a
     * customer this morning as "available". Being out on a rental therefore
     * wins over the stored status.
     */
    ctx.db
      .select({
        activeDresses: sql<number>`COUNT(*)`,
        dressesOut: sql<number>`COALESCE(SUM(CASE WHEN ${dressIsOutNow(dates.now)} THEN 1 ELSE 0 END), 0)`,
        dressesAvailable: sql<number>`COALESCE(SUM(CASE WHEN NOT ${dressIsOutNow(dates.now)} AND ${DressesTable.currentStatus} = 'available' THEN 1 ELSE 0 END), 0)`,
        dressesAtTailor: sql<number>`COALESCE(SUM(CASE WHEN NOT ${dressIsOutNow(dates.now)} AND ${DressesTable.currentStatus} = 'atTailor' THEN 1 ELSE 0 END), 0)`,
        dressesAtDryCleaner: sql<number>`COALESCE(SUM(CASE WHEN NOT ${dressIsOutNow(dates.now)} AND ${DressesTable.currentStatus} = 'atDryCleaner' THEN 1 ELSE 0 END), 0)`,
        dressesUnderRepair: sql<number>`COALESCE(SUM(CASE WHEN NOT ${dressIsOutNow(dates.now)} AND ${DressesTable.currentStatus} = 'underRepair' THEN 1 ELSE 0 END), 0)`,
      })
      .from(DressesTable)
      .where(
        and(
          isNull(DressesTable.deletedAt),
          eq(DressesTable.isActive, true),
          branchId ? eq(DressesTable.branchId, branchId) : undefined,
        ),
      ),

    // Counted off the customer table, not off reservations, so the badge equals
    // the /rental-customers grid total it links to.
    ctx.db
      .select({ customerCount: count() })
      .from(RentalCustomersTable)
      .where(customerBranchWhere),

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

    // Range revenue: money attached to a cancelled or soft-deleted reservation
    // is not revenue.
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

    // Count and average contract value share one pass. The average is the mean
    // agreed price of bookings MADE in the window — not revenue ÷ bookings,
    // which would mix payments on older reservations into the numerator.
    ctx.db
      .select({
        reservationsCount: count(ReservationsTable.id),
        averageContractValue: sql<
          string | null
        >`AVG(GREATEST(COALESCE(${ReservationsTable.totalPrice}, 0) - COALESCE(${ReservationsTable.discount}, 0), 0))`,
      })
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
        rentals: sql<number>`COALESCE(COUNT(${ReservationsTable.id}), 0)`,
        revenue: sql<number>`COALESCE(SUM(${ReservationsTable.totalPaid}), 0)`,
      })
      .from(DressesTable)
      /**
       * Windowed on `createdAt` — the date the booking was MADE — not on
       * `receivingDateTime`. Two reasons:
       *
       * 1. It matches `rangeReservationsRow` above, so "Reservations: N" and the
       *    sum of these rental counts describe the same set of rows. Windowing
       *    one on pickup and the other on creation made them disagree for every
       *    range, by design rather than by accident.
       * 2. The all-time range ends at end-of-day today (ALL_TIME_RANGE_START
       *    pairs with `endOfDay(now)`), so a pickup-based window silently drops
       *    every future booking. That put the same reservation inside
       *    `activeReservations` and outside its own dress's rental count.
       */
      .leftJoin(
        ReservationsTable,
        and(
          eq(DressesTable.id, ReservationsTable.dressId),
          isNull(ReservationsTable.deletedAt),
          not(eq(ReservationsTable.status, "cancelled")),
          between(ReservationsTable.createdAt, rangeStart, rangeEnd),
        ),
      )
      // Same portfolio the `activeDresses` tile counts: alive AND active. A
      // soft-deleted or retired dress must not rank here, or the two panels
      // describe different portfolios.
      .where(
        and(
          isNull(DressesTable.deletedAt),
          eq(DressesTable.isActive, true),
          branchId ? eq(DressesTable.branchId, branchId) : undefined,
        ),
      )
      .groupBy(
        DressesTable.id,
        DressesTable.code,
        DressesTable.title,
        DressesTable.isActive,
      )
      .orderBy(
        sql`COALESCE(COUNT(${ReservationsTable.id}), 0) DESC`,
        sql`COALESCE(SUM(${ReservationsTable.totalPaid}), 0) DESC`,
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

    // Display list only — capped at 6, oldest debt first. The true totals come
    // from outstandingTotalsRow below, which aggregates over every matching row.
    ctx.db.query.ReservationsTable.findMany({
      where: buildOutstandingWhere(),
      orderBy: [asc(balanceDueDateSql)],
      with: { dress: true },
      limit: 6,
    }),

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
    // this branch". A cancelled booking does not make someone a top customer.
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
      .where(countableReservationWhere)
      .groupBy(
        RentalCustomersTable.id,
        RentalCustomersTable.name,
        RentalCustomersTable.phone,
      )
      .orderBy(desc(sql`COUNT(${ReservationsTable.id})`))
      .limit(6),

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

    // Previous-period reservations + current-range cancellations (one
    // round-trip). This is the one figure that WANTS cancelled rows, so it is
    // the only consumer of the base predicate.
    ctx.db
      .select({
        prevReservations: sql<number>`COALESCE(SUM(CASE WHEN ${ReservationsTable.createdAt} >= ${prevRangeStart.toISOString()} AND ${ReservationsTable.createdAt} <= ${prevRangeEnd.toISOString()} AND ${ReservationsTable.status} <> 'cancelled' THEN 1 ELSE 0 END), 0)`,
        cancellations: sql<number>`COALESCE(SUM(CASE WHEN ${ReservationsTable.createdAt} >= ${rangeStart.toISOString()} AND ${ReservationsTable.createdAt} <= ${rangeEnd.toISOString()} AND ${ReservationsTable.status} = 'cancelled' THEN 1 ELSE 0 END), 0)`,
      })
      .from(ReservationsTable)
      .where(reservationsBaseWhere),

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

    // Outstanding totals aggregate over ALL matching reservations — the list
    // above is capped at 6 rows purely for display. The overdue split tells the
    // manager how much of the debt is already chaseable.
    ctx.db
      .select({
        totalOutstanding: sql<number>`COALESCE(SUM(${remainingBalanceSql}), 0)`,
        outstandingCount: count(),
        overdueOutstanding: sql<number>`COALESCE(SUM(CASE WHEN ${balanceDueDateSql} < ${nowIso} THEN ${remainingBalanceSql} ELSE 0 END), 0)`,
        overdueCount: sql<number>`COALESCE(SUM(CASE WHEN ${balanceDueDateSql} < ${nowIso} THEN 1 ELSE 0 END), 0)`,
      })
      .from(ReservationsTable)
      .where(buildOutstandingWhere()),
  ]);

  const reservationStats = reservationsAggregateRow[0] ?? {};
  const dressStats = dressPortfolioRow[0] ?? {};

  const rangeTotalRevenue = Number(rangeRevenueRow[0]?.totalRevenue ?? 0);
  const rangeReservationsCount = Number(
    rangeReservationsRow[0]?.reservationsCount ?? 0,
  );
  const rangeNewCustomers = Number(rangeNewCustomersRow[0]?.newCustomers ?? 0);
  // AVG returns NULL — not 0 — when no reservation was booked in the window,
  // which is what the "not enough data yet" state on the card renders.
  const rawAverageContractValue =
    rangeReservationsRow[0]?.averageContractValue ?? null;
  const averageReservationValue =
    rawAverageContractValue == null ? null : Number(rawAverageContractValue);

  const rangeTotalExpenses = Number(rangeExpensesRow[0]?.totalExpenses ?? 0);
  // KNOWN LIMITATION: revenue is windowed on `payments.createdAt` (the instant
  // the row was inserted) while expenses are windowed on the user-entered
  // `expenses.date` calendar day. There is no payment-date column, so a
  // back-dated payment lands in the period it was recorded, not the period it
  // was received. The net-profit card discloses this on screen — see the
  // `rangeNetProfitBasis` string under it.
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

  const activeDresses = Number(dressStats.activeDresses ?? 0);
  const dressesOutCount = Number(dressStats.dressesOut ?? 0);
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
      // Mirrors balanceDueDateSql: an uncollected booking is chased from its
      // pickup date, one already out or back from its return date.
      const dueDate =
        reservation.status === "reserved"
          ? reservation.receivingDateTime
          : reservation.returnDateTime;
      return {
        id: String(reservation.id),
        reservationCode: reservation.reservationCode,
        customerName: reservation.customerName,
        dressId: String(reservation.dressId),
        dressTitle: reservation.dress?.title ?? "—",
        dueDate: new Date(dueDate).toISOString(),
        remaining,
        status: reservation.status,
      };
    },
  );

  return {
    summary: {
      activeReservations: Number(reservationStats.activeReservations ?? 0),
      completedReservations: Number(
        reservationStats.completedReservations ?? 0,
      ),
      upcomingPickups: Number(reservationStats.upcomingPickups ?? 0),
      overdueReturns: Number(reservationStats.overdueReturns ?? 0),
      activeDresses,
      dressesOut: dressesOutCount,
      dressesAvailable: Number(dressStats.dressesAvailable ?? 0),
      dressesAtTailor: Number(dressStats.dressesAtTailor ?? 0),
      dressesAtDryCleaner: Number(dressStats.dressesAtDryCleaner ?? 0),
      dressesUnderRepair: Number(dressStats.dressesUnderRepair ?? 0),
      dressUtilizationRate,
      customerCount: Number(customerCountRow[0]?.customerCount ?? 0),
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
    overdueOutstanding: Number(
      outstandingTotalsRow[0]?.overdueOutstanding ?? 0,
    ),
    overdueOutstandingCount: Number(outstandingTotalsRow[0]?.overdueCount ?? 0),
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
