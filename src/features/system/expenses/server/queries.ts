import { and, count, eq, isNull, sum } from "drizzle-orm";

import {
  BranchMembershipsTable,
  DressesTable,
  ExpensesTable,
  UsersTable,
} from "@/drizzle/schema";
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
  const branchId = await resolveListBranchId(ctx, session, input.branchId);

  const whereClause = buildWhere({ ...input, branchId });

  const [{ value: total }] = await ctx.db
    .select({ value: count() })
    .from(ExpensesTable)
    .where(whereClause);

  const [{ value: totalAmount }] = await ctx.db
    .select({ value: sum(ExpensesTable.amount) })
    .from(ExpensesTable)
    .where(whereClause);

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
    total: Number(total),
    totalAmount: Number(totalAmount ?? 0),
  };
}

export async function exportExpenses(
  ctx: TRPCContext,
  input: ExpenseListFilterInput & { branchId?: string },
) {
  const session = getRequiredSession(ctx);
  assertOperationalStaff(session.user.role);
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
  const branchId = await resolveListBranchId(ctx, session, input.branchId);

  const dressesWhere = branchId
    ? and(eq(DressesTable.branchId, branchId), isNull(DressesTable.deletedAt))
    : isNull(DressesTable.deletedAt);

  const dresses = await ctx.db
    .select({ id: DressesTable.id, code: DressesTable.code, title: DressesTable.title })
    .from(DressesTable)
    .where(dressesWhere)
    .orderBy(DressesTable.code);

  const employeesWhere = branchId
    ? eq(BranchMembershipsTable.branchId, branchId)
    : undefined;

  const employees = await ctx.db
    .selectDistinctOn([UsersTable.id], {
      id: UsersTable.id,
      name: UsersTable.name,
      email: UsersTable.email,
    })
    .from(UsersTable)
    .innerJoin(BranchMembershipsTable, eq(BranchMembershipsTable.userId, UsersTable.id))
    .where(and(eq(UsersTable.role, "employee"), isNull(UsersTable.deletedAt), employeesWhere))
    .orderBy(UsersTable.name);

  return { dresses, employees };
}
