import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lte,
  or,
  type SQL,
} from "drizzle-orm";

import { UsersTable } from "@/drizzle/schema";
import {
  isDateRangeValue,
  isNumberRangeValue,
  parseLocalDateEnd,
  parseLocalDateStart,
} from "@/features/core/data-table/lib/filter-values";

import type { ListFilterInput } from "./schemas";

export const EXPORT_ROW_LIMIT = 50_000;

export const STAFF_ROLES = ["employee"] as const;

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

function applyCustomerColumnFilters(
  conditions: SQL[],
  columnFilters: { id: string; value: unknown }[],
) {
  for (const f of columnFilters) {
    if (f.id === "name" && typeof f.value === "string") {
      const s = sanitizeLikeFragment(f.value);
      if (s) conditions.push(ilike(UsersTable.name, `%${s}%`));
    } else if (f.id === "email" && typeof f.value === "string") {
      const s = sanitizeLikeFragment(f.value);
      if (s) conditions.push(ilike(UsersTable.email, `%${s}%`));
    } else if (f.id === "phone" && typeof f.value === "string") {
      const s = sanitizeLikeFragment(f.value);
      if (s) conditions.push(ilike(UsersTable.phone, `%${s}%`));
    } else if (f.id === "age" && isNumberRangeValue(f.value)) {
      const { min, max } = f.value;
      if (min != null) {
        conditions.push(
          and(isNotNull(UsersTable.age), gte(UsersTable.age, min))!,
        );
      }
      if (max != null) {
        conditions.push(
          and(isNotNull(UsersTable.age), lte(UsersTable.age, max))!,
        );
      }
    } else if (f.id === "role") {
      const selected = (Array.isArray(f.value) ? f.value : [f.value])
        .filter((v) => v != null && v !== "")
        .map(String)
        .filter((v): v is (typeof STAFF_ROLES)[number] =>
          (STAFF_ROLES as readonly string[]).includes(v),
        );
      if (selected.length > 0) {
        conditions.push(inArray(UsersTable.role, selected));
      }
    } else if (f.id === "verified") {
      const raw = f.value;
      const arr = Array.isArray(raw)
        ? raw.map(String)
        : raw != null && raw !== ""
          ? [String(raw)]
          : [];
      if (arr.length === 1) {
        if (arr[0] === "true")
          conditions.push(isNotNull(UsersTable.emailVerifiedAt));
        else if (arr[0] === "false")
          conditions.push(isNull(UsersTable.emailVerifiedAt));
      }
    } else if (f.id === "createdAt" && isDateRangeValue(f.value)) {
      const dr = f.value;
      if (dr.from?.trim()) {
        conditions.push(
          gte(UsersTable.createdAt, parseRangeBoundary(dr.from, "start")),
        );
      }
      if (dr.to?.trim()) {
        conditions.push(
          lte(UsersTable.createdAt, parseRangeBoundary(dr.to, "end")),
        );
      }
    } else if (f.id === "lastSignInAt" && isDateRangeValue(f.value)) {
      const dr = f.value;
      if (dr.from?.trim() || dr.to?.trim()) {
        conditions.push(isNotNull(UsersTable.lastSignInAt));
      }
      if (dr.from?.trim()) {
        conditions.push(
          gte(UsersTable.lastSignInAt, parseRangeBoundary(dr.from, "start")),
        );
      }
      if (dr.to?.trim()) {
        conditions.push(
          lte(UsersTable.lastSignInAt, parseRangeBoundary(dr.to, "end")),
        );
      }
    }
  }
}

export function buildWhere(
  role: "customer" | "employee",
  input: ListFilterInput,
): SQL | undefined {
  // "employee" covers the whole staff grid, admins included — otherwise the
  // export would silently drop the admins the grid is showing.
  const roleCondition =
    role === "employee"
      ? inArray(UsersTable.role, STAFF_ROLES)
      : eq(UsersTable.role, role);
  const conditions: SQL[] = [and(roleCondition, isNull(UsersTable.deletedAt))!];
  if (input.globalFilter?.trim()) {
    const s = sanitizeLikeFragment(input.globalFilter);
    if (s) {
      const q = `%${s}%`;
      conditions.push(
        or(
          ilike(UsersTable.name, q),
          ilike(UsersTable.email, q),
          ilike(UsersTable.phone, q),
        )!,
      );
    }
  }
  applyCustomerColumnFilters(conditions, input.columnFilters);
  return and(...conditions);
}

export function sortExpr(sorting: { id: string; desc: boolean }[]) {
  const sort = sorting[0];
  if (!sort) return desc(UsersTable.createdAt);
  const d = sort.desc ? desc : asc;
  switch (sort.id) {
    case "name":
      return d(UsersTable.name);
    case "email":
      return d(UsersTable.email);
    case "phone":
      return d(UsersTable.phone);
    case "age":
      return d(UsersTable.age);
    case "createdAt":
      return d(UsersTable.createdAt);
    case "lastSignInAt":
      return d(UsersTable.lastSignInAt);
    case "emailVerifiedAt":
      return d(UsersTable.emailVerifiedAt);
    default:
      return desc(UsersTable.createdAt);
  }
}
