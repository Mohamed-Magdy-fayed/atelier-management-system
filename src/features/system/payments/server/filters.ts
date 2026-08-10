import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lte,
  or,
  type SQL,
} from "drizzle-orm";

import {
  DressesTable,
  PaymentsTable,
  RentalCustomersTable,
  ReservationsTable,
} from "@/drizzle/schema";
import {
  type PaymentMethod,
  type PaymentType,
  paymentMethods,
  paymentTypes,
} from "@/drizzle/schemas/system/payments-table";
import {
  isDateRangeValue,
  parseLocalDateEnd,
  parseLocalDateStart,
} from "@/features/core/data-table/lib/filter-values";

import type { PaymentListFilterInput } from "./schemas";

export const PAYMENT_EXPORT_ROW_LIMIT = 50_000;

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

function applyPaymentColumnFilters(
  conditions: SQL[],
  columnFilters: { id: string; value: unknown }[],
) {
  for (const filter of columnFilters) {
    if (filter.id === "type") {
      const raw = filter.value;
      const values = Array.isArray(raw)
        ? raw.map(String)
        : raw != null && raw !== ""
          ? [String(raw)]
          : [];

      const cleaned = values.filter((v): v is PaymentType =>
        (paymentTypes as readonly string[]).includes(v),
      );

      if (cleaned.length === 1) {
        const only = cleaned[0];
        if (only) {
          conditions.push(eq(PaymentsTable.type, only));
        }
      } else if (cleaned.length > 1) {
        conditions.push(inArray(PaymentsTable.type, cleaned));
      }
    } else if (filter.id === "method") {
      const raw = filter.value;
      const values = Array.isArray(raw)
        ? raw.map(String)
        : raw != null && raw !== ""
          ? [String(raw)]
          : [];

      const cleaned = values.filter((v): v is PaymentMethod =>
        (paymentMethods as readonly string[]).includes(v),
      );

      if (cleaned.length === 1) {
        const only = cleaned[0];
        if (only) {
          conditions.push(eq(PaymentsTable.method, only));
        }
      } else if (cleaned.length > 1) {
        conditions.push(inArray(PaymentsTable.method, cleaned));
      }
    } else if (filter.id === "dress") {
      // Dress ids, matching how the reservations grid filters by dress.
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
    } else if (filter.id === "createdAt" && isDateRangeValue(filter.value)) {
      const range = filter.value;
      if (range.from?.trim()) {
        conditions.push(
          gte(PaymentsTable.createdAt, parseRangeBoundary(range.from, "start")),
        );
      }
      if (range.to?.trim()) {
        conditions.push(
          lte(PaymentsTable.createdAt, parseRangeBoundary(range.to, "end")),
        );
      }
    }
  }
}

export function buildWhere(input: PaymentListFilterInput): SQL | undefined {
  const conditions: SQL[] = [];

  if (input.branchId) {
    conditions.push(eq(PaymentsTable.branchId, input.branchId));
  }

  if (input.globalFilter?.trim()) {
    const s = sanitizeLikeFragment(input.globalFilter);
    if (s) {
      const query = `%${s}%`;
      const globalOr = or(
        ilike(PaymentsTable.note, query),
        ilike(ReservationsTable.reservationCode, query),
        ilike(RentalCustomersTable.name, query),
        ilike(RentalCustomersTable.phone, query),
        ilike(DressesTable.title, query),
      );
      if (globalOr) {
        conditions.push(globalOr);
      }
    }
  }

  applyPaymentColumnFilters(conditions, input.columnFilters);
  if (!conditions.length) return undefined;
  return and(...conditions);
}

export function sortExpr(sorting: { id: string; desc: boolean }[]) {
  const sort = sorting[0];
  if (!sort) return desc(PaymentsTable.createdAt);

  const direction = sort.desc ? desc : asc;

  switch (sort.id) {
    case "amount":
      return direction(PaymentsTable.amount);
    case "type":
      return direction(PaymentsTable.type);
    case "method":
      return direction(PaymentsTable.method);
    case "reservationCode":
      return direction(ReservationsTable.reservationCode);
    case "customerName":
      return direction(RentalCustomersTable.name);
    case "customerPhone":
      return direction(RentalCustomersTable.phone);
    case "totalPrice":
      return direction(ReservationsTable.totalPrice);
    case "totalPaid":
      return direction(ReservationsTable.totalPaid);
    case "dress":
      return direction(DressesTable.title);
    case "createdAt":
    default:
      return direction(PaymentsTable.createdAt);
  }
}
