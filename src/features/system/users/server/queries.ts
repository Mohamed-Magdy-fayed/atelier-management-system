import { and, asc, count, eq, isNull } from "drizzle-orm";

import { UsersTable } from "@/drizzle/schema";

import { buildWhere, EXPORT_ROW_LIMIT, sortExpr } from "./filters";
import type {
  ExportRowsInput,
  ListCustomersInput,
} from "./schemas";
import { assertStaffRole, getRequiredSession, type TRPCContext } from "./shared";
import { type UserGridRow, userGridSelect } from "./types";

export async function listEmployees(ctx: TRPCContext) {
  const session = getRequiredSession(ctx);
  assertStaffRole(session.user.role);
  const rows = await ctx.db
    .select(userGridSelect)
    .from(UsersTable)
    .where(and(eq(UsersTable.role, "employee"), isNull(UsersTable.deletedAt)))
    .orderBy(asc(UsersTable.name));

  return { rows: rows as UserGridRow[] };
}

export async function listCustomers(
  ctx: TRPCContext,
  input: ListCustomersInput,
) {
  const session = getRequiredSession(ctx);
  assertStaffRole(session.user.role);
  const whereClause = buildWhere("customer", input);

  const [{ value: total }] = await ctx.db
    .select({ value: count() })
    .from(UsersTable)
    .where(whereClause);

  const pageCount = Math.max(1, Math.ceil(Number(total) / input.perPage));
  const page = Math.min(input.page, pageCount);
  const offset = (page - 1) * input.perPage;

  const rows = await ctx.db
    .select(userGridSelect)
    .from(UsersTable)
    .where(whereClause)
    .orderBy(sortExpr(input.sorting))
    .limit(input.perPage)
    .offset(offset);

  return {
    rows: rows as UserGridRow[],
    pageCount,
    total: Number(total),
  };
}

export async function exportRows(ctx: TRPCContext, input: ExportRowsInput) {
  const session = getRequiredSession(ctx);
  assertStaffRole(session.user.role);
  const whereClause = buildWhere(input.role, input);

  const rows = await ctx.db
    .select(userGridSelect)
    .from(UsersTable)
    .where(whereClause)
    .orderBy(sortExpr(input.sorting))
    .limit(EXPORT_ROW_LIMIT);

  return { rows: rows as UserGridRow[] };
}
