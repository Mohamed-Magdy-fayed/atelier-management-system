import { and, asc, count, desc, eq, ilike, isNull, or } from "drizzle-orm";

import { ProductsTable } from "@/drizzle/schema";

import type { ListProductsInput } from "./schemas";
import { assertAdminRole, getRequiredSession, type TRPCContext } from "./shared";
import type { ProductGridRow } from "./types";

function buildWhereClause(input: ListProductsInput) {
  const query = input.globalFilter?.trim();
  const activeClause = isNull(ProductsTable.deletedAt);

  if (!query) {
    return activeClause;
  }

  const likeValue = `%${query}%`;
  return and(
    activeClause,
    or(
      ilike(ProductsTable.code, likeValue),
      ilike(ProductsTable.nameEn, likeValue),
      ilike(ProductsTable.nameAr, likeValue),
    ),
  );
}

function sortExpr(input: ListProductsInput) {
  const firstSort = input.sorting[0];

  if (!firstSort) {
    return [asc(ProductsTable.nameEn)];
  }

  switch (firstSort.id) {
    case "code":
      return [firstSort.desc ? desc(ProductsTable.code) : asc(ProductsTable.code)];
    case "nameAr":
      return [firstSort.desc ? desc(ProductsTable.nameAr) : asc(ProductsTable.nameAr)];
    case "price":
      return [firstSort.desc ? desc(ProductsTable.price) : asc(ProductsTable.price)];
    case "isActive":
      return [firstSort.desc ? desc(ProductsTable.isActive) : asc(ProductsTable.isActive)];
    case "createdAt":
      return [firstSort.desc ? desc(ProductsTable.createdAt) : asc(ProductsTable.createdAt)];
    case "updatedAt":
      return [firstSort.desc ? desc(ProductsTable.updatedAt) : asc(ProductsTable.updatedAt)];
    case "nameEn":
    default:
      return [firstSort.desc ? desc(ProductsTable.nameEn) : asc(ProductsTable.nameEn)];
  }
}

export async function listProducts(ctx: TRPCContext, input: ListProductsInput) {
  const session = getRequiredSession(ctx);
  assertAdminRole(session.user.role);

  const whereClause = buildWhereClause(input);
  const [{ value: total }] = await ctx.db
    .select({ value: count() })
    .from(ProductsTable)
    .where(whereClause);

  const pageCount = Math.max(1, Math.ceil(Number(total) / input.perPage));
  const page = Math.min(input.page, pageCount);
  const offset = (page - 1) * input.perPage;

  const rows = await ctx.db
    .select({
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
    })
    .from(ProductsTable)
    .where(whereClause)
    .orderBy(...sortExpr(input))
    .limit(input.perPage)
    .offset(offset);

  return {
    rows: rows as ProductGridRow[],
    pageCount,
    total: Number(total),
  };
}
