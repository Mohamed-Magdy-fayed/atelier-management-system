import { eq, inArray } from "drizzle-orm";

import { UsersTable } from "@/drizzle/schema";

import type {
  BulkSetVerifiedInput,
  SoftDeleteInput,
  UserMutationInput,
  UserUpdateInput,
} from "./schemas";
import { assertStaffRole, getRequiredSession, type TRPCContext } from "./shared";

export async function createUser(ctx: TRPCContext, input: UserMutationInput) {
  const session = getRequiredSession(ctx);
  assertStaffRole(session.user.role);
  const [row] = await ctx.db
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
  return { id: row.id };
}

export async function updateUser(ctx: TRPCContext, input: UserUpdateInput) {
  const session = getRequiredSession(ctx);
  assertStaffRole(session.user.role);
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
  return { id: input.id };
}

export async function softDeleteUsers(
  ctx: TRPCContext,
  input: SoftDeleteInput,
) {
  const session = getRequiredSession(ctx);
  assertStaffRole(session.user.role);
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
