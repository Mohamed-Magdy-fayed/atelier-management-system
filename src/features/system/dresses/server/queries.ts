import { TRPCError } from "@trpc/server";
import { and, count, eq, isNull } from "drizzle-orm";

import { DressesTable } from "@/drizzle/schema";
import { buildWhere, DRESS_EXPORT_ROW_LIMIT, sortExpr } from "./filters";
import type {
  DressByIdInput,
  ExportDressesInput,
  ListDressesInput,
} from "./schemas";
import {
  assertAdminRole,
  getRequiredSession,
  type TRPCContext,
} from "./shared";
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
  isActive: DressesTable.isActive,
  createdAt: DressesTable.createdAt,
  createdBy: DressesTable.createdBy,
  updatedAt: DressesTable.updatedAt,
  updatedBy: DressesTable.updatedBy,
  deletedAt: DressesTable.deletedAt,
  deletedBy: DressesTable.deletedBy,
} as const;

export async function listDresses(ctx: TRPCContext, input: ListDressesInput) {
  const session = getRequiredSession(ctx);
  assertAdminRole(session.user.role);

  const whereClause = buildWhere(input);
  const [{ value: total }] = await ctx.db
    .select({ value: count() })
    .from(DressesTable)
    .where(whereClause);

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
    total: Number(total),
  };
}

export async function exportDresses(
  ctx: TRPCContext,
  input: ExportDressesInput,
) {
  const session = getRequiredSession(ctx);
  assertAdminRole(session.user.role);

  const rows = await ctx.db
    .select(dressGridSelect)
    .from(DressesTable)
    .where(buildWhere(input))
    .orderBy(sortExpr(input.sorting))
    .limit(DRESS_EXPORT_ROW_LIMIT);

  return {
    rows: rows as DressGridRow[],
  };
}

export async function getDressById(ctx: TRPCContext, input: DressByIdInput) {
  const session = getRequiredSession(ctx);
  assertAdminRole(session.user.role);

  const dress = await ctx.db.query.DressesTable.findFirst({
    where: and(eq(DressesTable.id, input.id), isNull(DressesTable.deletedAt)),
  });

  if (!dress) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: ctx.t("systemPages.dressNotFound"),
    });
  }

  return dress;
}
