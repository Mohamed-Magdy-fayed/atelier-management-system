import { eq, inArray } from "drizzle-orm";

import { UsersTable } from "@/drizzle/schema";
import { writeScreenPermissionsCache } from "@/features/core/auth/core/screen-permission-cache";
import type { ScreenPermissionMap } from "@/features/core/auth/core/screen-permission-map";
import { revalidateAuthCache } from "@/features/core/auth/db-cache";

import {
  resolveBranchIds,
  syncUserBranchMemberships,
} from "./branch-memberships";
import { setUserPassword } from "./credentials";
import { syncUserScreenPermissions } from "./screen-permissions";
import type {
  BulkSetVerifiedInput,
  SoftDeleteInput,
  UserMutationInput,
  UserUpdateInput,
} from "./schemas";
import {
  assertAdminRole,
  assertNotGrantingAdmin,
  assertStaffRole,
  getRequiredSession,
  type TRPCContext,
} from "./shared";

/**
 * Pushes freshly-saved grants out to the places that read them.
 *
 * The Redis mirror is **overwritten, never deleted**: a delete would leave a
 * window where the proxy sees a miss and falls back to role defaults — briefly
 * granting more than the admin just saved. `revalidateAuthCache` busts the
 * `"use cache"` read behind `getAuth()`, which shares the same user tag.
 *
 * The target's own session is untouched, and does not need to be: their next
 * request re-reads both the mirror and the database.
 */
async function publishScreenPermissions(
  userId: string,
  map: ScreenPermissionMap,
) {
  await writeScreenPermissionsCache(userId, map);
  revalidateAuthCache({ id: userId });
}

export async function createUser(ctx: TRPCContext, input: UserMutationInput) {
  const session = getRequiredSession(ctx);
  assertStaffRole(session.user.role);
  // A brand-new account has no current role, so any request for `admin` here is
  // a grant, and grants do not happen through this API.
  assertNotGrantingAdmin(input.role);
  if (input.password !== undefined) {
    assertAdminRole(session.user.role);
  }
  // Handing out screen access is admin-only, for the same reason as passwords:
  // an employee editing a peer must not be able to widen anyone's access.
  if (input.screenPermissions !== undefined) {
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

    // Admins are unrestricted by the engine, so storing rows for one would be
    // dead data that later reads have to remember to ignore.
    if (input.screenPermissions !== undefined && input.role === "employee") {
      await syncUserScreenPermissions(trx, row.id, input.screenPermissions);
    }

    return row.id;
  });

  if (input.screenPermissions !== undefined && input.role === "employee") {
    await publishScreenPermissions(id, input.screenPermissions);
  }

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

  // Promoting anyone into `admin` is refused; editing someone already there is
  // not.
  assertNotGrantingAdmin(input.role, target?.role);

  // Editing an existing admin is admin-only too — otherwise an employee could
  // change an admin's email and lock them out of their own account.
  if (
    target?.role === "admin" ||
    input.password !== undefined ||
    input.screenPermissions !== undefined
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

  // Omitted means "don't touch", the same contract as `password`. An empty map
  // is a real instruction: clear every row and fall back to role defaults.
  if (input.screenPermissions !== undefined && input.role === "employee") {
    const stored = await syncUserScreenPermissions(
      ctx.db,
      input.id,
      input.screenPermissions,
    );
    await publishScreenPermissions(input.id, stored);
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
