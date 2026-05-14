import { count } from "drizzle-orm";

import { ProductsTable } from "@/drizzle/schema";
import { buildWhere, PRODUCT_EXPORT_ROW_LIMIT, sortExpr } from "./filters";
import type { ExportProductsInput, ListProductsInput } from "./schemas";
import {
  assertAdminRole,
  getRequiredSession,
  type TRPCContext,
} from "./shared";
import type { ProductGridRow } from "./types";

const productGridSelect = {
  id: ProductsTable.id,
  code: ProductsTable.code,
  nameEn: ProductsTable.nameEn,
  nameAr: ProductsTable.nameAr,
  price: ProductsTable.price,
  isActive: ProductsTable.isActive,
  createdAt: ProductsTable.createdAt,
  createdBy: ProductsTable.createdBy,
  updatedAt: ProductsTable.updatedAt,
  updatedBy: ProductsTable.updatedBy,
  deletedAt: ProductsTable.deletedAt,
  deletedBy: ProductsTable.deletedBy,
} as const;

export async function listProducts(ctx: TRPCContext, input: ListProductsInput) {
  const session = getRequiredSession(ctx);
  assertAdminRole(session.user.role);

  const whereClause = buildWhere(input);
  const [{ value: total }] = await ctx.db
    .select({ value: count() })
    .from(ProductsTable)
    .where(whereClause);

  const pageCount = Math.max(1, Math.ceil(Number(total) / input.perPage));
  const page = Math.min(input.page, pageCount);
  const offset = (page - 1) * input.perPage;

  const rows = await ctx.db
    .select(productGridSelect)
    .from(ProductsTable)
    .where(whereClause)
    .orderBy(sortExpr(input.sorting))
    .limit(input.perPage)
    .offset(offset);

  return {
    rows: rows as ProductGridRow[],
    pageCount,
    total: Number(total),
  };
}

export async function exportProducts(
  ctx: TRPCContext,
  input: ExportProductsInput,
) {
  const session = getRequiredSession(ctx);
  assertAdminRole(session.user.role);

  const rows = await ctx.db
    .select(productGridSelect)
    .from(ProductsTable)
    .where(buildWhere(input))
    .orderBy(sortExpr(input.sorting))
    .limit(PRODUCT_EXPORT_ROW_LIMIT);

  return {
    rows: rows as ProductGridRow[],
  };
}
