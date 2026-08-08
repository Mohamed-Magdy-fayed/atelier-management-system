import { and, eq, inArray, isNull, not, type SQL, sql } from "drizzle-orm";

import { DressesTable, ReservationsTable } from "@/drizzle/schema";
import type { ReservationStatus } from "@/drizzle/schemas/system/reservations-table";

/**
 * A dress is physically unavailable while a reservation in one of these states
 * covers today. `returned` frees the dress, `cancelled` never took it.
 */
export const LIVE_RENTAL_STATUSES = [
  "reserved",
  "pickedUp",
] as const satisfies readonly ReservationStatus[];

/**
 * States where the customer can still owe money. A cancelled reservation is
 * refunded, so it carries no receivable.
 */
export const OWING_STATUSES = [
  "reserved",
  "pickedUp",
  "returned",
] as const satisfies readonly ReservationStatus[];

/**
 * The row still exists: not soft-deleted, optionally scoped to one branch.
 * Use this only where cancelled rows are part of the answer (cancellation
 * counts, deletion audits) — every "how much / how many" figure wants
 * `countableReservation` instead.
 */
export function liveReservation(branchId?: string): SQL | undefined {
  return and(
    isNull(ReservationsTable.deletedAt),
    branchId ? eq(ReservationsTable.branchId, branchId) : undefined,
  );
}

/**
 * The single definition of a reservation that counts toward business metrics:
 * alive and not cancelled. Cancelled rows stay in the table for the
 * cancellation-rate numerator only. Every "how many bookings", "how many
 * customers" and revenue query must use this, or two panels on the same screen
 * will disagree.
 */
export function countableReservation(branchId?: string): SQL | undefined {
  return and(
    isNull(ReservationsTable.deletedAt),
    not(eq(ReservationsTable.status, "cancelled")),
    branchId ? eq(ReservationsTable.branchId, branchId) : undefined,
  );
}

/**
 * Correlated predicate: the dress in the enclosing `dresses` query is out on a
 * rental right now. Inclusive on both ends, matching `rentalWindowsOverlap`
 * (src/lib/rental-availability.ts) — the dashboard and the booking-conflict
 * check must share one definition of "occupied" or availability figures will
 * contradict what the reservation form allows.
 */
export function dressIsOutNow(now: Date): SQL {
  // ISO strings, not the Date object: inside a raw `sql` template drizzle binds
  // the value with no column type to infer from, and postgres.js refuses to
  // serialize a bare Date. Every timestamp comparison written this way in the
  // dashboard passes `.toISOString()` for the same reason.
  const nowIso = now.toISOString();
  return sql`EXISTS (
    SELECT 1 FROM ${ReservationsTable}
    WHERE ${ReservationsTable.dressId} = ${DressesTable.id}
      AND ${ReservationsTable.deletedAt} IS NULL
      AND ${ReservationsTable.status} IN ('reserved', 'pickedUp')
      AND ${ReservationsTable.receivingDateTime} <= ${nowIso}
      AND ${ReservationsTable.returnDateTime} >= ${nowIso}
  )`;
}

/** Reservation-side equivalent of {@link dressIsOutNow}, for counting rows. */
export function rentalCoversNow(now: Date): SQL | undefined {
  const nowIso = now.toISOString();
  return and(
    inArray(ReservationsTable.status, [...LIVE_RENTAL_STATUSES]),
    sql`${ReservationsTable.receivingDateTime} <= ${nowIso}`,
    sql`${ReservationsTable.returnDateTime} >= ${nowIso}`,
  );
}

/**
 * Money still owed on a reservation, floored at zero so an overpayment on one
 * booking can never cancel out a debt on another.
 */
export const remainingBalanceSql = sql`GREATEST((COALESCE(${ReservationsTable.totalPrice}, 0) - COALESCE(${ReservationsTable.discount}, 0)) - COALESCE(${ReservationsTable.totalPaid}, 0), 0)`;

/**
 * The date a balance becomes chargeable: pickup for a reservation not yet
 * collected, return for one already out or back.
 */
export const balanceDueDateSql = sql`CASE WHEN ${ReservationsTable.status} = 'reserved' THEN ${ReservationsTable.receivingDateTime} ELSE ${ReservationsTable.returnDateTime} END`;
