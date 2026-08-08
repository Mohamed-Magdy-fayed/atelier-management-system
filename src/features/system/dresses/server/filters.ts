import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNull,
  lte,
  or,
  type SQL,
  sql,
} from "drizzle-orm";

import { DressesTable, ReservationsTable } from "@/drizzle/schema";
import {
  type DressCurrentStatus,
  dressCurrentStatusValues,
} from "@/drizzle/schemas/system/dresses-table";
import {
  isDateRangeValue,
  isNumberRangeValue,
  parseLocalDateEnd,
  parseLocalDateStart,
} from "@/features/core/data-table/lib/filter-values";

import type { DressListFilterInput } from "./schemas";

export const DRESS_EXPORT_ROW_LIMIT = 50_000;

/**
 * How many times a dress has actually been rented, derived from reservations.
 * Requires the caller to join `reservations` on `rentalsCountJoin` and group by
 * the dress. Cancelled bookings never became a rental, so they do not count.
 */
export const DRESS_RENTALS_COUNT_EXPR = sql<number>`COUNT(${ReservationsTable.id})::int`;

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

function applyDressColumnFilters(
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
          conditions.push(eq(DressesTable.isActive, true));
        } else if (values[0] === "false") {
          conditions.push(eq(DressesTable.isActive, false));
        }
      }
    } else if (filter.id === "currentStatus") {
      const raw = filter.value;
      const values = Array.isArray(raw)
        ? raw.map(String)
        : raw != null && raw !== ""
          ? [String(raw)]
          : [];

      const cleaned = values.filter((v): v is DressCurrentStatus =>
        (dressCurrentStatusValues as readonly string[]).includes(v),
      );

      if (cleaned.length === 1) {
        const only = cleaned[0];
        if (only) conditions.push(eq(DressesTable.currentStatus, only));
      } else if (cleaned.length > 1) {
        conditions.push(inArray(DressesTable.currentStatus, cleaned));
      }
    } else if (
      filter.id === "pricePerDay" &&
      isNumberRangeValue(filter.value)
    ) {
      const { min, max } = filter.value;
      if (min != null) {
        conditions.push(gte(DressesTable.pricePerDay, min));
      }
      if (max != null) {
        conditions.push(lte(DressesTable.pricePerDay, max));
      }
    } else if (filter.id === "createdAt" && isDateRangeValue(filter.value)) {
      const range = filter.value;
      if (range.from?.trim()) {
        conditions.push(
          gte(DressesTable.createdAt, parseRangeBoundary(range.from, "start")),
        );
      }
      if (range.to?.trim()) {
        conditions.push(
          lte(DressesTable.createdAt, parseRangeBoundary(range.to, "end")),
        );
      }
    }
  }
}

export function buildWhere(input: DressListFilterInput): SQL | undefined {
  const conditions: SQL[] = [isNull(DressesTable.deletedAt)];

  if (input.branchId) {
    conditions.push(eq(DressesTable.branchId, input.branchId));
  }

  if (input.globalFilter?.trim()) {
    const s = sanitizeLikeFragment(input.globalFilter);
    if (s) {
      const query = `%${s}%`;
      conditions.push(
        or(
          ilike(DressesTable.code, query),
          ilike(DressesTable.title, query),
          ilike(DressesTable.color, query),
          ilike(DressesTable.size, query),
        )!,
      );
    }
  }

  applyDressColumnFilters(conditions, input.columnFilters);
  return and(...conditions);
}

export function sortExpr(sorting: { id: string; desc: boolean }[]) {
  const sort = sorting[0];
  if (!sort) return asc(DressesTable.title);

  const direction = sort.desc ? desc : asc;

  switch (sort.id) {
    case "code":
      return direction(DressesTable.code);
    case "pricePerDay":
      return direction(DressesTable.pricePerDay);
    case "isActive":
      return direction(DressesTable.isActive);
    case "currentStatus":
      return direction(DressesTable.currentStatus);
    case "createdAt":
      return direction(DressesTable.createdAt);
    case "updatedAt":
      return direction(DressesTable.updatedAt);
    case "title":
    default:
      return direction(DressesTable.title);
  }
}
