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
} from "drizzle-orm";

import { ReservationsTable } from "@/drizzle/schema";
import type { ReservationStatus } from "@/drizzle/schemas/system/reservations-table";
import { reservationStatuses } from "@/drizzle/schemas/system/reservations-table";
import {
  isDateRangeValue,
  parseLocalDateEnd,
  parseLocalDateStart,
} from "@/features/core/data-table/lib/filter-values";

import type { ReservationListFilterInput } from "./schemas";

export const RESERVATION_EXPORT_ROW_LIMIT = 50_000;

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

function applyDateRangeColumn(
  conditions: SQL[],
  column:
    | typeof ReservationsTable.createdAt
    | typeof ReservationsTable.receivingDateTime
    | typeof ReservationsTable.occasionDate
    | typeof ReservationsTable.returnDateTime,
  value: unknown,
) {
  if (!isDateRangeValue(value)) return;

  const range = value;
  if (range.from?.trim()) {
    conditions.push(
      gte(column, parseRangeBoundary(range.from, "start")),
    );
  }
  if (range.to?.trim()) {
    conditions.push(lte(column, parseRangeBoundary(range.to, "end")));
  }
}

function applyReservationColumnFilters(
  conditions: SQL[],
  columnFilters: { id: string; value: unknown }[],
) {
  for (const filter of columnFilters) {
    if (filter.id === "dressId") {
      const raw = filter.value;
      const values = Array.isArray(raw)
        ? raw.map(String)
        : raw != null && raw !== ""
          ? [String(raw)]
          : [];

      if (values.length === 1 && values[0]) {
        conditions.push(eq(ReservationsTable.dressId, values[0]));
      } else if (values.length > 1) {
        conditions.push(inArray(ReservationsTable.dressId, values));
      }
    } else if (filter.id === "status") {
      const raw = filter.value;
      const values = Array.isArray(raw)
        ? raw.map(String)
        : raw != null && raw !== ""
          ? [String(raw)]
          : [];

      const cleaned = values.filter((v): v is ReservationStatus =>
        (reservationStatuses as readonly string[]).includes(v),
      );

      if (cleaned.length === 1) {
        const only = cleaned[0];
        if (only) {
          conditions.push(eq(ReservationsTable.status, only));
        }
      } else if (cleaned.length > 1) {
        conditions.push(inArray(ReservationsTable.status, cleaned));
      }
    } else if (filter.id === "createdAt") {
      applyDateRangeColumn(
        conditions,
        ReservationsTable.createdAt,
        filter.value,
      );
    } else if (filter.id === "receivingDateTime") {
      applyDateRangeColumn(
        conditions,
        ReservationsTable.receivingDateTime,
        filter.value,
      );
    } else if (filter.id === "occasionDate") {
      applyDateRangeColumn(
        conditions,
        ReservationsTable.occasionDate,
        filter.value,
      );
    } else if (filter.id === "returnDateTime") {
      applyDateRangeColumn(
        conditions,
        ReservationsTable.returnDateTime,
        filter.value,
      );
    }
  }
}

export function buildWhere(input: ReservationListFilterInput): SQL | undefined {
  const conditions: SQL[] = [isNull(ReservationsTable.deletedAt)];

  if (input.branchId) {
    conditions.push(eq(ReservationsTable.branchId, input.branchId));
  }

  if (input.globalFilter?.trim()) {
    const s = sanitizeLikeFragment(input.globalFilter);
    if (s) {
      const query = `%${s}%`;
      const globalOr = or(
        ilike(ReservationsTable.reservationCode, query),
        ilike(ReservationsTable.customerName, query),
        ilike(ReservationsTable.customerPhone, query),
      );
      if (globalOr) {
        conditions.push(globalOr);
      }
    }
  }

  applyReservationColumnFilters(conditions, input.columnFilters);
  return and(...conditions);
}

export function sortExpr(sorting: { id: string; desc: boolean }[]) {
  const sort = sorting[0];
  if (!sort) return desc(ReservationsTable.receivingDateTime);

  const direction = sort.desc ? desc : asc;

  switch (sort.id) {
    case "reservationCode":
      return direction(ReservationsTable.reservationCode);
    case "customerName":
      return direction(ReservationsTable.customerName);
    case "totalPrice":
      return direction(ReservationsTable.totalPrice);
    case "receivingDateTime":
      return direction(ReservationsTable.receivingDateTime);
    case "returnDateTime":
      return direction(ReservationsTable.returnDateTime);
    case "occasionDate":
      return direction(ReservationsTable.occasionDate);
    case "status":
      return direction(ReservationsTable.status);
    case "createdAt":
      return direction(ReservationsTable.createdAt);
    case "updatedAt":
      return direction(ReservationsTable.updatedAt);
    default:
      return direction(ReservationsTable.receivingDateTime);
  }
}
