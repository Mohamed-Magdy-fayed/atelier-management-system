import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import { ExpensesTable } from "@/drizzle/schema";
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

export async function createExpense(
  ctx: TRPCContext,
  input: CreateExpenseInput,
) {
  const session = getRequiredSession(ctx);
  assertOperationalStaff(session.user.role);
  await assertUserCanAccessBranch(ctx, session, input.branchId);

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

  const existing = await ctx.db.query.ExpensesTable.findFirst({
    where: eq(ExpensesTable.id, input.id),
    columns: { branchId: true },
  });

  if (!existing) {
    throw new TRPCError({ code: "NOT_FOUND" });
  }

  await assertUserCanAccessBranch(ctx, session, existing.branchId);

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
