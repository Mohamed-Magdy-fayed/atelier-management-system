import { and, count, eq, isNull } from "drizzle-orm";

import { RentalCustomersTable, ReservationsTable } from "@/drizzle/schema";
import {
  assertOperationalStaff,
  resolveListBranchId,
} from "@/features/system/shared/staff-access";
import {
  buildWhere,
  RENTAL_CUSTOMER_EXPORT_ROW_LIMIT,
  RESERVATIONS_COUNT_EXPR,
  sortExpr,
} from "./filters";
import type {
  ExportRentalCustomersInput,
  ListRentalCustomersInput,
} from "./schemas";

import { getRequiredSession, type TRPCContext } from "./shared";
import type { RentalCustomerGridRow } from "./types";

const rentalCustomerGridSelect = {
  id: RentalCustomersTable.id,
  name: RentalCustomersTable.name,
  phone: RentalCustomersTable.phone,
  reservationsCount: RESERVATIONS_COUNT_EXPR,
  createdAt: RentalCustomersTable.createdAt,
} as const;

/**
 * Join backing `RESERVATIONS_COUNT_EXPR`. The count is derived rather than cached
 * on the customer: the cached column only ever reflected the legacy import and
 * went stale the moment a reservation was booked in-app.
 *
 * Scoped to the same branch as the list filter, so a branch's customer list
 * reports that branch's bookings while all-branches reports the tenant total —
 * matching how the dashboard counts a branch's customers. Cancelled reservations
 * are included (only soft-deleted ones are excluded), the same definition the
 * dashboard's top-customers list uses.
 */
function reservationsCountJoin(branchId?: string) {
  return and(
    eq(ReservationsTable.customerId, RentalCustomersTable.id),
    isNull(ReservationsTable.deletedAt),
    branchId ? eq(ReservationsTable.branchId, branchId) : undefined,
  );
}

export async function listRentalCustomers(
  ctx: TRPCContext,
  input: ListRentalCustomersInput,
) {
  const session = getRequiredSession(ctx);
  assertOperationalStaff(session.user.role);
  const branchId = await resolveListBranchId(ctx, session, input.branchId);

  const whereClause = buildWhere({ ...input, branchId });
  // Deliberately unjoined: grouping is per customer, so the row count is the
  // same with or without the reservations join.
  const [{ value: total }] = await ctx.db
    .select({ value: count() })
    .from(RentalCustomersTable)
    .where(whereClause);

  const pageCount = Math.max(1, Math.ceil(Number(total) / input.perPage));
  const page = Math.min(input.page, pageCount);
  const offset = (page - 1) * input.perPage;

  const rows = await ctx.db
    .select(rentalCustomerGridSelect)
    .from(RentalCustomersTable)
    .leftJoin(ReservationsTable, reservationsCountJoin(branchId))
    .where(whereClause)
    // Grouping by the primary key alone is enough for Postgres to allow the
    // other customer columns in the select list.
    .groupBy(RentalCustomersTable.id)
    .orderBy(sortExpr(input.sorting))
    .limit(input.perPage)
    .offset(offset);

  return {
    rows: rows as RentalCustomerGridRow[],
    pageCount,
    total: Number(total),
  };
}

export async function exportRentalCustomers(
  ctx: TRPCContext,
  input: ExportRentalCustomersInput,
) {
  const session = getRequiredSession(ctx);
  assertOperationalStaff(session.user.role);
  const branchId = await resolveListBranchId(ctx, session, input.branchId);

  const rows = await ctx.db
    .select(rentalCustomerGridSelect)
    .from(RentalCustomersTable)
    .leftJoin(ReservationsTable, reservationsCountJoin(branchId))
    .where(buildWhere({ ...input, branchId }))
    .groupBy(RentalCustomersTable.id)
    .orderBy(sortExpr(input.sorting))
    .limit(RENTAL_CUSTOMER_EXPORT_ROW_LIMIT);

  return {
    rows: rows as RentalCustomerGridRow[],
  };
}
