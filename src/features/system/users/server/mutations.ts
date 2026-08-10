import { eq, inArray } from "drizzle-orm";

import { UsersTable } from "@/drizzle/schema";

import {
  resolveBranchIds,
  syncUserBranchMemberships,
} from "./branch-memberships";
import { setUserPassword } from "./credentials";
import type {
  BulkSetVerifiedInput,
  SoftDeleteInput,
  UserMutationInput,
  UserUpdateInput,
} from "./schemas";
import {
  assertAdminRole,
  assertStaffRole,
  getRequiredSession,
  type TRPCContext,
} from "./shared";

export async function createUser(ctx: TRPCContext, input: UserMutationInput) {
  const session = getRequiredSession(ctx);
  assertStaffRole(session.user.role);
  if (input.role === "admin" || input.password !== undefined) {
    assertAdminRole(session.user.role);
  }

  const id = await ctx.db.transaction(async (trx) => {
    const [row] = await trx
      .insert(UsersTable)
      .values({
        createdBy: session.user.id,
        name: input.name ?? null,
        email: input.email,
        phone: input.phone ?? null,
        age: input.age ?? null,
        role: input.role,
      })
      .returning({ id: UsersTable.id });

    if (input.password) {
      await setUserPassword(trx, row.id, input.password);
    }

    const branchIds = resolveBranchIds(input);
    if (
      (input.role === "employee" || input.role === "admin") &&
      branchIds.length > 0
    ) {
      await syncUserBranchMemberships(trx, row.id, branchIds);
    }

    return row.id;
  });

  return { id };
}

export async function updateUser(ctx: TRPCContext, input: UserUpdateInput) {
  const session = getRequiredSession(ctx);
  assertStaffRole(session.user.role);

  const [target] = await ctx.db
    .select({ role: UsersTable.role })
    .from(UsersTable)
    .where(eq(UsersTable.id, input.id))
    .limit(1);

  // Editing an existing admin is admin-only too — otherwise an employee could
  // change an admin's email and lock them out of their own account.
  if (
    input.role === "admin" ||
    target?.role === "admin" ||
    input.password !== undefined
  ) {
    assertAdminRole(session.user.role);
  }

  await ctx.db
    .update(UsersTable)
    .set({
      name: input.name ?? null,
      email: input.email,
      phone: input.phone ?? null,
      age: input.age ?? null,
      role: input.role,
      updatedBy: session.user.id,
    })
    .where(eq(UsersTable.id, input.id));

  // Only rewrite credentials when a password was actually submitted, so
  // editing a user's details never disturbs their existing sign-in.
  if (input.password) {
    await setUserPassword(ctx.db, input.id, input.password);
  }

  if (input.branchIds !== undefined) {
    if (input.role === "employee" || input.role === "admin") {
      await syncUserBranchMemberships(ctx.db, input.id, input.branchIds);
    }
  } else {
    const branchIds = resolveBranchIds(input);
    if (
      branchIds.length > 0 &&
      (input.role === "employee" || input.role === "admin")
    ) {
      await syncUserBranchMemberships(ctx.db, input.id, branchIds);
    }
  }

  return { id: input.id };
}

export async function softDeleteUsers(
  ctx: TRPCContext,
  input: SoftDeleteInput,
) {
  const session = getRequiredSession(ctx);
  assertStaffRole(session.user.role);

  const targets = await ctx.db
    .select({ role: UsersTable.role })
    .from(UsersTable)
    .where(inArray(UsersTable.id, input.ids));

  if (targets.some((target) => target.role === "admin")) {
    assertAdminRole(session.user.role);
  }

  await ctx.db
    .update(UsersTable)
    .set({
      deletedAt: new Date(),
      deletedBy: session.user.id,
    })
    .where(inArray(UsersTable.id, input.ids));
  return { count: input.ids.length };
}

export async function bulkSetVerified(
  ctx: TRPCContext,
  input: BulkSetVerifiedInput,
) {
  const session = getRequiredSession(ctx);
  assertStaffRole(session.user.role);
  await ctx.db
    .update(UsersTable)
    .set({
      emailVerifiedAt: input.verified ? new Date() : null,
      updatedBy: session.user.id,
    })
    .where(inArray(UsersTable.id, input.ids));
  return { count: input.ids.length };
}
