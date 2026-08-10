import { inArray, sql } from "drizzle-orm";

import {
  DressesTable,
  RentalCustomersTable,
  ReservationsTable,
} from "@/drizzle/schema";
import type { createTRPCContext } from "@/integrations/trpc/init";

import { countableReservation } from "./reservation-scope";

type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;
type Transaction = Parameters<
  Parameters<TRPCContext["db"]["transaction"]>[0]
>[0];

/** Connection or transaction — the caller owns whichever it passes in. */
export type ReservationStatsDb = TRPCContext["db"] | Transaction;

type AffectedIds = Iterable<string | null | undefined>;

function distinctIds(ids: AffectedIds): string[] {
  const set = new Set<string>();
  for (const id of ids) {
    if (id) set.add(id);
  }
  return [...set];
}

/**
 * Correlated summaries of the rows that count, for the row being updated.
 * `countableReservation()` is embedded rather than restated so these can never
 * drift from the definition the grids and the dashboard share.
 */
const CUSTOMER_LAST_RESERVATION_AT = sql`(
  SELECT MAX(${ReservationsTable.createdAt})
  FROM ${ReservationsTable}
  WHERE ${ReservationsTable.customerId} = ${RentalCustomersTable.id}
    AND ${countableReservation()}
)`;

const DRESS_LAST_RESERVED_AT = sql`(
  SELECT MAX(${ReservationsTable.createdAt})
  FROM ${ReservationsTable}
  WHERE ${ReservationsTable.dressId} = ${DressesTable.id}
    AND ${countableReservation()}
)`;

const DRESS_TIMES_RENTED = sql`(
  SELECT COUNT(*)::int
  FROM ${ReservationsTable}
  WHERE ${ReservationsTable.dressId} = ${DressesTable.id}
    AND ${countableReservation()}
)`;

/**
 * Recomputes the cached booking summary for the given customers.
 *
 * Recompute rather than increment: a reservation can be created, moved to
 * another customer, cancelled, un-cancelled or soft-deleted, and an offset
 * applied on only some of those paths is how a counter starts lying. Every path
 * calls this with whoever it touched, and the answer comes back from the
 * reservations themselves.
 */
export async function refreshCustomerReservationStats(
  db: ReservationStatsDb,
  customerIds: AffectedIds,
): Promise<void> {
  const ids = distinctIds(customerIds);
  if (ids.length === 0) return;

  await db
    .update(RentalCustomersTable)
    .set({ lastReservationAt: CUSTOMER_LAST_RESERVATION_AT })
    .where(inArray(RentalCustomersTable.id, ids));
}

/** Dress-side equivalent of {@link refreshCustomerReservationStats}. */
export async function refreshDressReservationStats(
  db: ReservationStatsDb,
  dressIds: AffectedIds,
): Promise<void> {
  const ids = distinctIds(dressIds);
  if (ids.length === 0) return;

  await db
    .update(DressesTable)
    .set({
      timesRented: DRESS_TIMES_RENTED,
      lastReservedAt: DRESS_LAST_RESERVED_AT,
      // Held at its current value so the automatic `$onUpdate` bump does not
      // fire: booking a dress is not an edit to the dress, and the audit dialog
      // would otherwise report one.
      updatedAt: sql`${DressesTable.updatedAt}`,
    })
    .where(inArray(DressesTable.id, ids));
}

/**
 * Refreshes both sides of a reservation write. Call it after the write, so the
 * recompute sees the final state.
 */
export async function refreshReservationStats(
  db: ReservationStatsDb,
  affected: { customerIds?: AffectedIds; dressIds?: AffectedIds },
): Promise<void> {
  await Promise.all([
    refreshCustomerReservationStats(db, affected.customerIds ?? []),
    refreshDressReservationStats(db, affected.dressIds ?? []),
  ]);
}
