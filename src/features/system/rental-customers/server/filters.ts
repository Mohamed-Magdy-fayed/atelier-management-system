import {
  and,
  asc,
  desc,
  gte,
  ilike,
  lte,
  or,
  type SQL,
  sql,
} from "drizzle-orm";

import { RentalCustomersTable, ReservationsTable } from "@/drizzle/schema";
import {
  isDateRangeValue,
  parseLocalDateEnd,
  parseLocalDateStart,
} from "@/features/core/data-table/lib/filter-values";

import type { RentalCustomerListFilterInput } from "./schemas";

export const RENTAL_CUSTOMER_EXPORT_ROW_LIMIT = 50_000;

/**
 * Derived reservation count for a customer row. Requires the caller to join
 * `reservations` and group by the customer — see `reservationsCountJoin` in
 * ./queries.ts. Shared with `sortExpr` so the sort and the displayed value can
 * never disagree.
 */
export const RESERVATIONS_COUNT_EXPR = sql<number>`COUNT(${ReservationsTable.id})::int`;

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

  // Customers are tenant-wide, so a branch "owns" a customer only through the
  // reservations it took for them.
  if (input.branchId) {
    conditions.push(
      sql`EXISTS (
        SELECT 1 FROM ${ReservationsTable}
        WHERE ${ReservationsTable.customerId} = ${RentalCustomersTable.id}
          AND ${ReservationsTable.branchId} = ${input.branchId}
          AND ${ReservationsTable.deletedAt} IS NULL
      )`,
    );
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
      return direction(RESERVATIONS_COUNT_EXPR);
    case "createdAt":
      return direction(RentalCustomersTable.createdAt);
    case "name":
    default:
      return direction(RentalCustomersTable.name);
  }
}
