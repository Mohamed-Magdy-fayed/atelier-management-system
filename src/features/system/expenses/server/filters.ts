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

import { ExpensesTable } from "@/drizzle/schema";
import {
  type ExpenseType,
  expenseTypes,
} from "@/drizzle/schemas/system/expenses-table";
import {
  isDateRangeValue,
  parseLocalDateEnd,
  parseLocalDateStart,
} from "@/features/core/data-table/lib/filter-values";

import type { ExpenseListFilterInput } from "./schemas";

export const EXPENSE_EXPORT_ROW_LIMIT = 50_000;

function sanitizeLikeFragment(raw: string): string {
  return raw.trim().replace(/[%_\\]/g, "");
}

function applyExpenseColumnFilters(
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

      const cleaned = values.filter((v): v is ExpenseType =>
        (expenseTypes as readonly string[]).includes(v),
      );

      if (cleaned.length === 1) {
        const only = cleaned[0];
        if (only) conditions.push(eq(ExpensesTable.type, only));
      } else if (cleaned.length > 1) {
        conditions.push(inArray(ExpensesTable.type, cleaned));
      }
    } else if (filter.id === "date" && isDateRangeValue(filter.value)) {
      const range = filter.value;
      if (range.from?.trim()) {
        conditions.push(
          gte(ExpensesTable.date, parseLocalDateStart(range.from.trim()).toISOString().slice(0, 10)),
        );
      }
      if (range.to?.trim()) {
        conditions.push(
          lte(ExpensesTable.date, parseLocalDateEnd(range.to.trim()).toISOString().slice(0, 10)),
        );
      }
    }
  }
}

export function buildWhere(input: ExpenseListFilterInput & { branchId?: string }): SQL | undefined {
  const conditions: SQL[] = [];

  if (input.branchId) {
    conditions.push(eq(ExpensesTable.branchId, input.branchId));
  }

  if (input.globalFilter?.trim()) {
    const s = sanitizeLikeFragment(input.globalFilter);
    if (s) {
      const query = `%${s}%`;
      conditions.push(
        or(
          ilike(ExpensesTable.description, query),
          ilike(ExpensesTable.note, query),
        )!,
      );
    }
  }

  applyExpenseColumnFilters(conditions, input.columnFilters);
  if (!conditions.length) return undefined;
  return and(...conditions);
}

export function sortExpr(sorting: { id: string; desc: boolean }[]) {
  const sort = sorting[0];
  if (!sort) return desc(ExpensesTable.date);

  const direction = sort.desc ? desc : asc;

  switch (sort.id) {
    case "amount":
      return direction(ExpensesTable.amount);
    case "type":
      return direction(ExpensesTable.type);
    case "date":
      return direction(ExpensesTable.date);
    case "createdAt":
      return direction(ExpensesTable.createdAt);
    default:
      return direction(ExpensesTable.date);
  }
}
