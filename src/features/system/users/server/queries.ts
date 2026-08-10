import { and, asc, count, eq, inArray, isNull, sql } from "drizzle-orm";

import {
  BranchesTable,
  BranchMembershipsTable,
  UserCredentialsTable,
  UsersTable,
} from "@/drizzle/schema";

import {
  getUserBranchIds as fetchUserBranchIds,
  listAssignableBranches as fetchAssignableBranches,
} from "./branch-memberships";
import { buildWhere, EXPORT_ROW_LIMIT, sortExpr, STAFF_ROLES } from "./filters";
import type {
  ExportRowsInput,
  ListCustomersInput,
  ListEmployeesInput,
  ResolveActorsInput,
} from "./schemas";
import {
  assertStaffRole,
  getRequiredSession,
  type TRPCContext,
} from "./shared";
import {
  type AuditActor,
  type EmployeeBranchRef,
  type EmployeeGridRow,
  type UserGridRow,
  userGridSelect,
} from "./types";

export async function getUserBranchIds(ctx: TRPCContext, userId: string) {
  const session = getRequiredSession(ctx);
  assertStaffRole(session.user.role);
  return fetchUserBranchIds(ctx, userId);
}

export async function listAssignableBranches(ctx: TRPCContext) {
  const session = getRequiredSession(ctx);
  assertStaffRole(session.user.role);
  return fetchAssignableBranches(ctx);
}

/**
 * Resolves audit actor ids to display identities. Soft-deleted users are
 * included on purpose — an audit trail must still name whoever acted.
 */
export async function resolveActors(
  ctx: TRPCContext,
  input: ResolveActorsInput,
): Promise<AuditActor[]> {
  const session = getRequiredSession(ctx);
  assertStaffRole(session.user.role);

  if (input.ids.length === 0) return [];

  return ctx.db
    .select({
      id: UsersTable.id,
      name: UsersTable.name,
      email: UsersTable.email,
    })
    .from(UsersTable)
    .where(inArray(UsersTable.id, input.ids));
}

export async function listEmployees(
  ctx: TRPCContext,
  input: ListEmployeesInput,
) {
  const session = getRequiredSession(ctx);
  assertStaffRole(session.user.role);

  // Admins share this grid with employees — there is no separate admin screen.
  const employeeWhere = and(
    inArray(UsersTable.role, STAFF_ROLES),
    isNull(UsersTable.deletedAt),
  );

  const staffSelect = {
    ...userGridSelect,
    hasPassword: sql<boolean>`${UserCredentialsTable.userId} is not null`,
  };

  const branchFilterIds = Array.from(
    new Set(
      [
        ...(input.branchIds ?? []),
        ...(input.branchId ? [input.branchId] : []),
      ],
    ),
  );

  const rows =
    branchFilterIds.length > 0
      ? await ctx.db
          .selectDistinct(staffSelect)
          .from(UsersTable)
          .leftJoin(
            UserCredentialsTable,
            eq(UserCredentialsTable.userId, UsersTable.id),
          )
          .innerJoin(
            BranchMembershipsTable,
            eq(BranchMembershipsTable.userId, UsersTable.id),
          )
          .where(
            and(
              employeeWhere,
              inArray(BranchMembershipsTable.branchId, branchFilterIds),
            ),
          )
          .orderBy(asc(UsersTable.name))
      : await ctx.db
          .select(staffSelect)
          .from(UsersTable)
          .leftJoin(
            UserCredentialsTable,
            eq(UserCredentialsTable.userId, UsersTable.id),
          )
          .where(employeeWhere)
          .orderBy(asc(UsersTable.name));

  const userIds = rows.map((row) => row.id);
  if (userIds.length === 0) {
    return { rows: [] as EmployeeGridRow[] };
  }

  const membershipRows = await ctx.db
    .select({
      userId: BranchMembershipsTable.userId,
      id: BranchesTable.id,
      nameEn: BranchesTable.nameEn,
      nameAr: BranchesTable.nameAr,
    })
    .from(BranchMembershipsTable)
    .innerJoin(
      BranchesTable,
      eq(BranchMembershipsTable.branchId, BranchesTable.id),
    )
    .where(inArray(BranchMembershipsTable.userId, userIds))
    .orderBy(asc(BranchesTable.nameEn));

  const branchesByUserId = new Map<string, EmployeeBranchRef[]>();
  for (const row of membershipRows) {
    const existing = branchesByUserId.get(row.userId) ?? [];
    existing.push({
      id: row.id,
      nameEn: row.nameEn,
      nameAr: row.nameAr,
    });
    branchesByUserId.set(row.userId, existing);
  }

  const enriched: EmployeeGridRow[] = rows.map((row) => ({
    ...row,
    branches: branchesByUserId.get(row.id) ?? [],
  }));

  return { rows: enriched };
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
