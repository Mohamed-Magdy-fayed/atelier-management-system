import { TRPCError } from "@trpc/server";
import { and, count, eq, isNull, not } from "drizzle-orm";

import {
  BranchesTable,
  DressesTable,
  ReservationsTable,
} from "@/drizzle/schema";
import {
  columnFiltersExcept,
  type GridFacetCounts,
  toFacetCounts,
} from "@/features/system/shared/facets";
import {
  assertOperationalStaff,
  assertUserCanAccessBranch,
  resolveListBranchId,
} from "@/features/system/shared/staff-access";
import {
  buildWhere,
  DRESS_EXPORT_ROW_LIMIT,
  DRESS_NET_VALUE_EXPR,
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
  timesRented: DressesTable.timesRented,
  lastReservedAt: DressesTable.lastReservedAt,
  netValue: DRESS_NET_VALUE_EXPR,
  isActive: DressesTable.isActive,
  currentStatus: DressesTable.currentStatus,
  createdAt: DressesTable.createdAt,
  createdBy: DressesTable.createdBy,
  updatedAt: DressesTable.updatedAt,
  updatedBy: DressesTable.updatedBy,
  deletedAt: DressesTable.deletedAt,
  deletedBy: DressesTable.deletedBy,
} as const;

export async function listDresses(ctx: TRPCContext, input: ListDressesInput) {
  const session = getRequiredSession(ctx);
  assertOperationalStaff(session.user.role);
  const branchId = await resolveListBranchId(ctx, session, input.branchId);

  const whereClause = buildWhere({ ...input, branchId });

  /** Every filter except the facet's own — see `columnFiltersExcept`. */
  const facetWhere = (columnId: string) =>
    buildWhere({
      ...input,
      branchId,
      columnFilters: columnFiltersExcept(input.columnFilters, columnId),
    });

  const [totalRow, activeFacet, currentStatusFacet] = await Promise.all([
    ctx.db.select({ value: count() }).from(DressesTable).where(whereClause),
    ctx.db
      .select({ key: DressesTable.isActive, value: count() })
      .from(DressesTable)
      .where(facetWhere("isActive"))
      .groupBy(DressesTable.isActive),
    ctx.db
      .select({ key: DressesTable.currentStatus, value: count() })
      .from(DressesTable)
      .where(facetWhere("currentStatus"))
      .groupBy(DressesTable.currentStatus),
  ]);

  const total = Number(totalRow[0]?.value ?? 0);
  const pageCount = Math.max(1, Math.ceil(Number(total) / input.perPage));
  const page = Math.min(input.page, pageCount);
  const offset = (page - 1) * input.perPage;

  const rows = await ctx.db
    .select(dressGridSelect)
    .from(DressesTable)
    .where(whereClause)
    .orderBy(sortExpr(input.sorting))
    .limit(input.perPage)
    .offset(offset);

  return {
    rows: rows as DressGridRow[],
    pageCount,
    total,
    facets: {
      // The status filter sends "true"/"false" strings, so the boolean keys
      // have to be stringified the same way to line up with its options.
      isActive: toFacetCounts(activeFacet),
      currentStatus: toFacetCounts(currentStatusFacet),
    } satisfies GridFacetCounts,
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
    .where(buildWhere({ ...input, branchId }))
    .orderBy(sortExpr(input.sorting))
    .limit(DRESS_EXPORT_ROW_LIMIT);

  return {
    rows: rows as DressGridRow[],
  };
}

/**
 * Dress list for the "filter by dress" control on every grid that has one.
 *
 * Unlike the reservation form's dress list this keeps inactive dresses: a
 * payment or expense recorded against a dress that has since been retired must
 * still be reachable from the filter.
 */
export async function listDressFilterOptions(
  ctx: TRPCContext,
  input: { branchId?: string },
) {
  const session = getRequiredSession(ctx);
  assertOperationalStaff(session.user.role);
  const branchId = await resolveListBranchId(ctx, session, input.branchId);

  return ctx.db
    .select({
      id: DressesTable.id,
      code: DressesTable.code,
      title: DressesTable.title,
      isActive: DressesTable.isActive,
      branchNameEn: BranchesTable.nameEn,
      branchNameAr: BranchesTable.nameAr,
    })
    .from(DressesTable)
    .innerJoin(BranchesTable, eq(DressesTable.branchId, BranchesTable.id))
    .where(
      and(
        isNull(DressesTable.deletedAt),
        branchId ? eq(DressesTable.branchId, branchId) : undefined,
      ),
    )
    .orderBy(DressesTable.title);
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

  return dress;
}
