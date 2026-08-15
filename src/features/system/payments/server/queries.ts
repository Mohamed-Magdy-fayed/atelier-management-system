import { count, eq, type SQL } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

import {
  DressesTable,
  PaymentsTable,
  RentalCustomersTable,
  ReservationsTable,
} from "@/drizzle/schema";
import {
  columnFiltersExcept,
  type GridFacetCounts,
  toFacetCounts,
} from "@/features/system/shared/facets";
import { assertScreenPermission } from "@/features/system/shared/screen-access";
import {
  assertOperationalStaff,
  resolveListBranchId,
} from "@/features/system/shared/staff-access";
import { buildWhere, PAYMENT_EXPORT_ROW_LIMIT, sortExpr } from "./filters";
import type { ExportPaymentsInput, ListPaymentsInput } from "./schemas";

import { getRequiredSession, type TRPCContext } from "./shared";
import type { PaymentGridRow } from "./types";

const paymentGridSelect = {
  id: PaymentsTable.id,
  branchId: PaymentsTable.branchId,
  reservationId: PaymentsTable.reservationId,
  customerId: PaymentsTable.customerId,
  amount: PaymentsTable.amount,
  type: PaymentsTable.type,
  method: PaymentsTable.method,
  note: PaymentsTable.note,
  createdAt: PaymentsTable.createdAt,
  createdBy: PaymentsTable.createdBy,
  reservationCode: ReservationsTable.reservationCode,
  totalPrice: ReservationsTable.totalPrice,
  totalPaid: ReservationsTable.totalPaid,
  customerName: RentalCustomersTable.name,
  customerPhone: RentalCustomersTable.phone,
  dressId: ReservationsTable.dressId,
  dressTitle: DressesTable.title,
} as const;

/**
 * Payments are always attached to a reservation, a customer and (through the
 * reservation) a dress, so the grid joins them inline instead of paying for a
 * second round trip per row.
 */
function paymentListQuery(ctx: TRPCContext) {
  return ctx.db
    .select(paymentGridSelect)
    .from(PaymentsTable)
    .innerJoin(
      ReservationsTable,
      eq(PaymentsTable.reservationId, ReservationsTable.id),
    )
    .innerJoin(
      RentalCustomersTable,
      eq(PaymentsTable.customerId, RentalCustomersTable.id),
    )
    .innerJoin(DressesTable, eq(ReservationsTable.dressId, DressesTable.id));
}

/** Row count over the same joins as the grid, so the two always agree. */
function paymentCountQuery(ctx: TRPCContext) {
  return ctx.db
    .select({ value: count() })
    .from(PaymentsTable)
    .innerJoin(
      ReservationsTable,
      eq(PaymentsTable.reservationId, ReservationsTable.id),
    )
    .innerJoin(
      RentalCustomersTable,
      eq(PaymentsTable.customerId, RentalCustomersTable.id),
    )
    .innerJoin(DressesTable, eq(ReservationsTable.dressId, DressesTable.id));
}

/** Same, grouped by one column: how many rows each filter option would match. */
function paymentFacetQuery(ctx: TRPCContext, key: PgColumn) {
  return ctx.db
    .select({ key, value: count() })
    .from(PaymentsTable)
    .innerJoin(
      ReservationsTable,
      eq(PaymentsTable.reservationId, ReservationsTable.id),
    )
    .innerJoin(
      RentalCustomersTable,
      eq(PaymentsTable.customerId, RentalCustomersTable.id),
    )
    .innerJoin(DressesTable, eq(ReservationsTable.dressId, DressesTable.id));
}

export async function listPayments(ctx: TRPCContext, input: ListPaymentsInput) {
  const session = getRequiredSession(ctx);
  assertOperationalStaff(session.user.role);
  await assertScreenPermission(ctx, session, "payments", "view");
  const branchId = await resolveListBranchId(ctx, session, input.branchId);

  const whereClause = buildWhere({ ...input, branchId });

  /** Every filter except the facet's own — see `columnFiltersExcept`. */
  const facetWhere = (columnId: string): SQL | undefined =>
    buildWhere({
      ...input,
      branchId,
      columnFilters: columnFiltersExcept(input.columnFilters, columnId),
    });

  const [totalRow, typeFacet, methodFacet, dressFacet] = await Promise.all([
    paymentCountQuery(ctx).where(whereClause),
    paymentFacetQuery(ctx, PaymentsTable.type)
      .where(facetWhere("type"))
      .groupBy(PaymentsTable.type),
    paymentFacetQuery(ctx, PaymentsTable.method)
      .where(facetWhere("method"))
      .groupBy(PaymentsTable.method),
    paymentFacetQuery(ctx, ReservationsTable.dressId)
      .where(facetWhere("dress"))
      .groupBy(ReservationsTable.dressId),
  ]);

  const total = Number(totalRow[0]?.value ?? 0);
  const pageCount = Math.max(1, Math.ceil(total / input.perPage));
  const page = Math.min(input.page, pageCount);
  const offset = (page - 1) * input.perPage;

  const rows = await paymentListQuery(ctx)
    .where(whereClause)
    .orderBy(sortExpr(input.sorting))
    .limit(input.perPage)
    .offset(offset);

  return {
    rows: rows as PaymentGridRow[],
    pageCount,
    total,
    facets: {
      type: toFacetCounts(typeFacet),
      method: toFacetCounts(methodFacet),
      dress: toFacetCounts(dressFacet),
    } satisfies GridFacetCounts,
  };
}

export async function exportPayments(
  ctx: TRPCContext,
  input: ExportPaymentsInput,
) {
  const session = getRequiredSession(ctx);
  assertOperationalStaff(session.user.role);
  await assertScreenPermission(ctx, session, "payments", "view");
  const branchId = await resolveListBranchId(ctx, session, input.branchId);

  const rows = await paymentListQuery(ctx)
    .where(buildWhere({ ...input, branchId }))
    .orderBy(sortExpr(input.sorting))
    .limit(PAYMENT_EXPORT_ROW_LIMIT);

  return {
    rows: rows as PaymentGridRow[],
  };
}
