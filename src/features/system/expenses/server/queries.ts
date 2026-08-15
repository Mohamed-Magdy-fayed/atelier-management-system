import { and, count, eq, exists, isNull, sql, sum } from "drizzle-orm";

import {
  BranchMembershipsTable,
  DressesTable,
  ExpensesTable,
  UsersTable,
} from "@/drizzle/schema";
import {
  columnFiltersExcept,
  type GridFacetCounts,
  toFacetCounts,
} from "@/features/system/shared/facets";
import { assertScreenPermission } from "@/features/system/shared/screen-access";
import {
  assertOperationalStaff,
  resolveListBranchId,
} from "@/features/system/shared/staff-access";

import { buildWhere, EXPENSE_EXPORT_ROW_LIMIT, sortExpr } from "./filters";
import type { ExpenseListFilterInput, ListExpensesInput } from "./schemas";
import { getRequiredSession, type TRPCContext } from "./shared";
import type { ExpenseGridRow } from "./types";

const expenseGridSelect = {
  id: ExpensesTable.id,
  branchId: ExpensesTable.branchId,
  type: ExpensesTable.type,
  amount: ExpensesTable.amount,
  dressId: ExpensesTable.dressId,
  dressCode: DressesTable.code,
  dressTitle: DressesTable.title,
  employeeId: ExpensesTable.employeeId,
  employeeName: UsersTable.name,
  description: ExpensesTable.description,
  note: ExpensesTable.note,
  date: ExpensesTable.date,
  createdBy: ExpensesTable.createdBy,
  createdAt: ExpensesTable.createdAt,
} as const;

function expenseBaseQuery(ctx: TRPCContext) {
  return ctx.db
    .select(expenseGridSelect)
    .from(ExpensesTable)
    .leftJoin(DressesTable, eq(ExpensesTable.dressId, DressesTable.id))
    .leftJoin(UsersTable, eq(ExpensesTable.employeeId, UsersTable.id));
}

export async function listExpenses(ctx: TRPCContext, input: ListExpensesInput) {
  const session = getRequiredSession(ctx);
  assertOperationalStaff(session.user.role);
  await assertScreenPermission(ctx, session, "expenses", "view");
  const branchId = await resolveListBranchId(ctx, session, input.branchId);

  const whereClause = buildWhere({ ...input, branchId });

  /** Every filter except the facet's own — see `columnFiltersExcept`. */
  const facetWhere = (columnId: string) =>
    buildWhere({
      ...input,
      branchId,
      columnFilters: columnFiltersExcept(input.columnFilters, columnId),
    });

  const [totalRow, totalAmountRow, typeFacet, dressFacet] = await Promise.all([
    ctx.db.select({ value: count() }).from(ExpensesTable).where(whereClause),
    ctx.db
      .select({ value: sum(ExpensesTable.amount) })
      .from(ExpensesTable)
      .where(whereClause),
    ctx.db
      .select({ key: ExpensesTable.type, value: count() })
      .from(ExpensesTable)
      .where(facetWhere("type"))
      .groupBy(ExpensesTable.type),
    ctx.db
      .select({ key: ExpensesTable.dressId, value: count() })
      .from(ExpensesTable)
      .where(facetWhere("dressCode"))
      .groupBy(ExpensesTable.dressId),
  ]);

  const total = Number(totalRow[0]?.value ?? 0);
  const totalAmount = totalAmountRow[0]?.value;

  const pageCount = Math.max(1, Math.ceil(Number(total) / input.perPage));
  const page = Math.min(input.page, pageCount);
  const offset = (page - 1) * input.perPage;

  const rows = await expenseBaseQuery(ctx)
    .where(whereClause)
    .orderBy(sortExpr(input.sorting))
    .limit(input.perPage)
    .offset(offset);

  return {
    rows: rows as ExpenseGridRow[],
    pageCount,
    total,
    totalAmount: Number(totalAmount ?? 0),
    facets: {
      type: toFacetCounts(typeFacet),
      dressCode: toFacetCounts(dressFacet),
    } satisfies GridFacetCounts,
  };
}

export async function exportExpenses(
  ctx: TRPCContext,
  input: ExpenseListFilterInput & { branchId?: string },
) {
  const session = getRequiredSession(ctx);
  assertOperationalStaff(session.user.role);
  await assertScreenPermission(ctx, session, "expenses", "view");
  const branchId = await resolveListBranchId(ctx, session, input.branchId);

  const rows = await expenseBaseQuery(ctx)
    .where(buildWhere({ ...input, branchId }))
    .orderBy(sortExpr(input.sorting ?? []))
    .limit(EXPENSE_EXPORT_ROW_LIMIT);

  return { rows: rows as ExpenseGridRow[] };
}

export async function getExpenseFormData(
  ctx: TRPCContext,
  input: { branchId?: string },
) {
  const session = getRequiredSession(ctx);
  assertOperationalStaff(session.user.role);
  await assertScreenPermission(ctx, session, "expenses", "view");
  const branchId = await resolveListBranchId(ctx, session, input.branchId);

  const dressesWhere = branchId
    ? and(eq(DressesTable.branchId, branchId), isNull(DressesTable.deletedAt))
    : isNull(DressesTable.deletedAt);

  const dresses = await ctx.db
    .select({ id: DressesTable.id, code: DressesTable.code, title: DressesTable.title })
    .from(DressesTable)
    .where(dressesWhere)
    .orderBy(DressesTable.code);

  // A correlated EXISTS keeps one row per user without DISTINCT ON, which
  // Postgres would require to match the leading ORDER BY expression.
  const hasMembership = exists(
    ctx.db
      .select({ one: sql`1` })
      .from(BranchMembershipsTable)
      .where(
        and(
          eq(BranchMembershipsTable.userId, UsersTable.id),
          branchId ? eq(BranchMembershipsTable.branchId, branchId) : undefined,
        ),
      ),
  );

  const employees = await ctx.db
    .select({
      id: UsersTable.id,
      name: UsersTable.name,
      email: UsersTable.email,
    })
    .from(UsersTable)
    .where(and(eq(UsersTable.role, "employee"), isNull(UsersTable.deletedAt), hasMembership))
    .orderBy(UsersTable.name);

  return { dresses, employees };
}
