import { TRPCError } from "@trpc/server";
import { and, eq, isNull } from "drizzle-orm";

import {
  BranchMembershipsTable,
  DressesTable,
  ExpensesTable,
} from "@/drizzle/schema";
import { assertScreenPermission } from "@/features/system/shared/screen-access";
import {
  assertOperationalStaff,
  assertUserCanAccessBranch,
} from "@/features/system/shared/staff-access";

import type {
  CreateExpenseInput,
  DeleteExpenseInput,
  UpdateExpenseInput,
} from "./schemas";
import { getRequiredSession, type TRPCContext } from "./shared";

/**
 * The form's dress and employee options are branch-scoped, but the branch is a
 * client-supplied input — so an expense could otherwise be linked to a dress or
 * an employee belonging to a different branch.
 */
async function assertLinksBelongToBranch(
  ctx: TRPCContext,
  branchId: string,
  links: { dressId?: string | null; employeeId?: string | null },
) {
  if (links.dressId) {
    const dress = await ctx.db.query.DressesTable.findFirst({
      where: and(
        eq(DressesTable.id, links.dressId),
        eq(DressesTable.branchId, branchId),
        isNull(DressesTable.deletedAt),
      ),
      columns: { id: true },
    });

    if (!dress) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: ctx.t("systemPages.expenseDressNotInBranch"),
      });
    }
  }

  if (links.employeeId) {
    const membership = await ctx.db.query.BranchMembershipsTable.findFirst({
      where: and(
        eq(BranchMembershipsTable.userId, links.employeeId),
        eq(BranchMembershipsTable.branchId, branchId),
      ),
      columns: { branchId: true },
    });

    if (!membership) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: ctx.t("systemPages.expenseEmployeeNotInBranch"),
      });
    }
  }
}

export async function createExpense(
  ctx: TRPCContext,
  input: CreateExpenseInput,
) {
  const session = getRequiredSession(ctx);
  assertOperationalStaff(session.user.role);
  await assertScreenPermission(ctx, session, "expenses", "create");
  await assertUserCanAccessBranch(ctx, session, input.branchId);
  await assertLinksBelongToBranch(ctx, input.branchId, input);

  const [row] = await ctx.db
    .insert(ExpensesTable)
    .values({
      branchId: input.branchId,
      type: input.type,
      amount: input.amount,
      dressId: input.dressId ?? null,
      employeeId: input.employeeId ?? null,
      description: input.description,
      note: input.note ?? null,
      date: input.date,
      createdBy: session.user.id,
    })
    .returning({ id: ExpensesTable.id });

  return { id: row!.id };
}

export async function updateExpense(
  ctx: TRPCContext,
  input: UpdateExpenseInput,
) {
  const session = getRequiredSession(ctx);
  assertOperationalStaff(session.user.role);
  await assertScreenPermission(ctx, session, "expenses", "update");

  const existing = await ctx.db.query.ExpensesTable.findFirst({
    where: eq(ExpensesTable.id, input.id),
    columns: { branchId: true },
  });

  if (!existing) {
    throw new TRPCError({ code: "NOT_FOUND" });
  }

  await assertUserCanAccessBranch(ctx, session, existing.branchId);
  // The branch of an existing expense never changes, so links are validated
  // against the stored branch rather than anything the client sent.
  await assertLinksBelongToBranch(ctx, existing.branchId, input);

  await ctx.db
    .update(ExpensesTable)
    .set({
      type: input.type,
      amount: input.amount,
      dressId: input.dressId ?? null,
      employeeId: input.employeeId ?? null,
      description: input.description ?? "",
      note: input.note ?? null,
      date: input.date,
      updatedBy: session.user.id,
    })
    .where(eq(ExpensesTable.id, input.id));

  return { id: input.id };
}

export async function deleteExpense(
  ctx: TRPCContext,
  input: DeleteExpenseInput,
) {
  const session = getRequiredSession(ctx);
  assertOperationalStaff(session.user.role);
  await assertScreenPermission(ctx, session, "expenses", "delete");

  const existing = await ctx.db.query.ExpensesTable.findFirst({
    where: eq(ExpensesTable.id, input.id),
    columns: { branchId: true },
  });

  if (!existing) {
    throw new TRPCError({ code: "NOT_FOUND" });
  }

  await assertUserCanAccessBranch(ctx, session, existing.branchId);

  await ctx.db.delete(ExpensesTable).where(eq(ExpensesTable.id, input.id));

  return { id: input.id };
}
