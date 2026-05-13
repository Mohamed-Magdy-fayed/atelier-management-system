import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  isNull,
  lte,
  or,
  type SQL,
} from "drizzle-orm";

import { ProductsTable } from "@/drizzle/schema";
import {
  isDateRangeValue,
  isNumberRangeValue,
  parseLocalDateEnd,
  parseLocalDateStart,
} from "@/features/core/data-table/lib/filter-values";

import type { ProductListFilterInput } from "./schemas";

export const PRODUCT_EXPORT_ROW_LIMIT = 50_000;

function parseRangeBoundary(raw: string, mode: "start" | "end"): Date {
  const trimmed = raw.trim();
  if (trimmed.includes("T")) return new Date(trimmed);
  return mode === "start"
    ? parseLocalDateStart(trimmed)
    : parseLocalDateEnd(trimmed);
}

function sanitizeLikeFragment(raw: string): string {
  return raw.trim().replace(/[%_\\]/g, "");
}

function applyProductColumnFilters(
  conditions: SQL[],
  columnFilters: { id: string; value: unknown }[],
) {
  for (const filter of columnFilters) {
    if (filter.id === "isActive") {
      const raw = filter.value;
      const values = Array.isArray(raw)
        ? raw.map(String)
        : raw != null && raw !== ""
          ? [String(raw)]
          : [];

      if (values.length === 1) {
        if (values[0] === "true") {
          conditions.push(eq(ProductsTable.isActive, true));
        } else if (values[0] === "false") {
          conditions.push(eq(ProductsTable.isActive, false));
        }
      }
    } else if (filter.id === "price" && isNumberRangeValue(filter.value)) {
      const { min, max } = filter.value;
      if (min != null) {
        conditions.push(gte(ProductsTable.price, min));
      }
      if (max != null) {
        conditions.push(lte(ProductsTable.price, max));
      }
    } else if (filter.id === "createdAt" && isDateRangeValue(filter.value)) {
      const range = filter.value;
      if (range.from?.trim()) {
        conditions.push(
          gte(ProductsTable.createdAt, parseRangeBoundary(range.from, "start")),
        );
      }
      if (range.to?.trim()) {
        conditions.push(
          lte(ProductsTable.createdAt, parseRangeBoundary(range.to, "end")),
        );
      }
    }
  }
}

export function buildWhere(input: ProductListFilterInput): SQL | undefined {
  const conditions: SQL[] = [isNull(ProductsTable.deletedAt)];

  if (input.globalFilter?.trim()) {
    const s = sanitizeLikeFragment(input.globalFilter);
    if (s) {
      const query = `%${s}%`;
      conditions.push(
        or(
          ilike(ProductsTable.code, query),
          ilike(ProductsTable.nameEn, query),
          ilike(ProductsTable.nameAr, query),
        )!,
      );
    }
  }

  applyProductColumnFilters(conditions, input.columnFilters);
  return and(...conditions);
}

export function sortExpr(sorting: { id: string; desc: boolean }[]) {
  const sort = sorting[0];
  if (!sort) return asc(ProductsTable.nameEn);

  const direction = sort.desc ? desc : asc;

  switch (sort.id) {
    case "code":
      return direction(ProductsTable.code);
    case "nameAr":
      return direction(ProductsTable.nameAr);
    case "price":
      return direction(ProductsTable.price);
    case "isActive":
      return direction(ProductsTable.isActive);
    case "createdAt":
      return direction(ProductsTable.createdAt);
    case "updatedAt":
      return direction(ProductsTable.updatedAt);
    case "nameEn":
    default:
      return direction(ProductsTable.nameEn);
  }
}
