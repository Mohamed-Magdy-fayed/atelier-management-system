import { TRPCError } from "@trpc/server";
import { and, count, eq, isNull, not } from "drizzle-orm";

import { DressesTable, ReservationsTable } from "@/drizzle/schema";
import {
  assertOperationalStaff,
  assertUserCanAccessBranch,
  resolveListBranchId,
} from "@/features/system/shared/staff-access";
import {
  buildWhere,
  DRESS_EXPORT_ROW_LIMIT,
  DRESS_RENTALS_COUNT_EXPR,
  sortExpr,
} from "./filters";
import type {
  DressByIdInput,
  ExportDressesInput,
  ListDressesInput,
} from "./schemas";

import { getRequiredSession, type TRPCContext } from "./shared";
import type { DressGridRow } from "./types";

const dressGridSelect = {
  id: DressesTable.id,
  branchId: DressesTable.branchId,
  code: DressesTable.code,
  title: DressesTable.title,
  description: DressesTable.description,
  images: DressesTable.images,
  size: DressesTable.size,
  color: DressesTable.color,
  pricePerDay: DressesTable.pricePerDay,
  depositAmount: DressesTable.depositAmount,
  insurance: DressesTable.insurance,
  timesRented: DRESS_RENTALS_COUNT_EXPR,
  isActive: DressesTable.isActive,
  currentStatus: DressesTable.currentStatus,
  createdAt: DressesTable.createdAt,
  createdBy: DressesTable.createdBy,
  updatedAt: DressesTable.updatedAt,
  updatedBy: DressesTable.updatedBy,
  deletedAt: DressesTable.deletedAt,
  deletedBy: DressesTable.deletedBy,
} as const;

/**
 * Join backing `DRESS_RENTALS_COUNT_EXPR`. The rental count is derived rather
 * than read from the old `dresses.timesRented` counter: nothing in the booking
 * flow ever incremented that column — only the legacy import wrote it — so
 * every dress rented in-app reported 0 forever.
 *
 * A dress belongs to exactly one branch and `createReservation` refuses a dress
 * from another branch, so the join needs no branch scoping of its own.
 */
const rentalsCountJoin = and(
  eq(ReservationsTable.dressId, DressesTable.id),
  isNull(ReservationsTable.deletedAt),
  not(eq(ReservationsTable.status, "cancelled")),
);

export async function listDresses(ctx: TRPCContext, input: ListDressesInput) {
  const session = getRequiredSession(ctx);
  assertOperationalStaff(session.user.role);
  const branchId = await resolveListBranchId(ctx, session, input.branchId);

  const whereClause = buildWhere({ ...input, branchId });
  const [{ value: total }] = await ctx.db
    .select({ value: count() })
    .from(DressesTable)
    .where(whereClause);

  const pageCount = Math.max(1, Math.ceil(Number(total) / input.perPage));
  const page = Math.min(input.page, pageCount);
  const offset = (page - 1) * input.perPage;

  // The total above stays unjoined: grouping is per dress, so the row count is
  // unaffected by the join.
  const rows = await ctx.db
    .select(dressGridSelect)
    .from(DressesTable)
    .leftJoin(ReservationsTable, rentalsCountJoin)
    .where(whereClause)
    .groupBy(DressesTable.id)
    .orderBy(sortExpr(input.sorting))
    .limit(input.perPage)
    .offset(offset);

  return {
    rows: rows as DressGridRow[],
    pageCount,
    total: Number(total),
  };
}

export async function exportDresses(
  ctx: TRPCContext,
  input: ExportDressesInput,
) {
  const session = getRequiredSession(ctx);
  assertOperationalStaff(session.user.role);
  const branchId = await resolveListBranchId(ctx, session, input.branchId);

  const rows = await ctx.db
    .select(dressGridSelect)
    .from(DressesTable)
    .leftJoin(ReservationsTable, rentalsCountJoin)
    .where(buildWhere({ ...input, branchId }))
    .groupBy(DressesTable.id)
    .orderBy(sortExpr(input.sorting))
    .limit(DRESS_EXPORT_ROW_LIMIT);

  return {
    rows: rows as DressGridRow[],
  };
}

export async function getDressById(ctx: TRPCContext, input: DressByIdInput) {
  const session = getRequiredSession(ctx);
  assertOperationalStaff(session.user.role);

  const dress = await ctx.db.query.DressesTable.findFirst({
    where: and(eq(DressesTable.id, input.id), isNull(DressesTable.deletedAt)),
  });

  if (!dress) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: ctx.t("systemPages.dressNotFound"),
    });
  }

  await assertUserCanAccessBranch(ctx, session, dress.branchId);

  // The view dialog shows "times rented", so the detail row needs the same
  // derived count as the grid rather than the dropped counter column.
  const [rentals] = await ctx.db
    .select({ timesRented: DRESS_RENTALS_COUNT_EXPR })
    .from(ReservationsTable)
    .where(
      and(
        eq(ReservationsTable.dressId, dress.id),
        isNull(ReservationsTable.deletedAt),
        not(eq(ReservationsTable.status, "cancelled")),
      ),
    );

  return { ...dress, timesRented: Number(rentals?.timesRented ?? 0) };
}
