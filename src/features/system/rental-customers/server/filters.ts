import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  lte,
  or,
  type SQL,
} from "drizzle-orm";

import { RentalCustomersTable } from "@/drizzle/schema";
import {
  isDateRangeValue,
  parseLocalDateEnd,
  parseLocalDateStart,
} from "@/features/core/data-table/lib/filter-values";

import type { RentalCustomerListFilterInput } from "./schemas";

export const RENTAL_CUSTOMER_EXPORT_ROW_LIMIT = 50_000;

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

function applyRentalCustomerColumnFilters(
  conditions: SQL[],
  columnFilters: { id: string; value: unknown }[],
) {
  for (const filter of columnFilters) {
    if (filter.id === "createdAt" && isDateRangeValue(filter.value)) {
      const range = filter.value;
      if (range.from?.trim()) {
        conditions.push(
          gte(
            RentalCustomersTable.createdAt,
            parseRangeBoundary(range.from, "start"),
          ),
        );
      }
      if (range.to?.trim()) {
        conditions.push(
          lte(
            RentalCustomersTable.createdAt,
            parseRangeBoundary(range.to, "end"),
          ),
        );
      }
    }
  }
}

export function buildWhere(
  input: RentalCustomerListFilterInput,
): SQL | undefined {
  const conditions: SQL[] = [];

  if (input.branchId) {
    conditions.push(eq(RentalCustomersTable.branchId, input.branchId));
  }

  if (input.globalFilter?.trim()) {
    const s = sanitizeLikeFragment(input.globalFilter);
    if (s) {
      const query = `%${s}%`;
      conditions.push(
        or(
          ilike(RentalCustomersTable.name, query),
          ilike(RentalCustomersTable.phone, query),
        )!,
      );
    }
  }

  applyRentalCustomerColumnFilters(conditions, input.columnFilters);
  if (!conditions.length) return undefined;
  return and(...conditions);
}

export function sortExpr(sorting: { id: string; desc: boolean }[]) {
  const sort = sorting[0];
  if (!sort) return asc(RentalCustomersTable.name);

  const direction = sort.desc ? desc : asc;

  switch (sort.id) {
    case "phone":
      return direction(RentalCustomersTable.phone);
    case "reservationsCount":
      return direction(RentalCustomersTable.reservationsCount);
    case "createdAt":
      return direction(RentalCustomersTable.createdAt);
    case "name":
    default:
      return direction(RentalCustomersTable.name);
  }
}
