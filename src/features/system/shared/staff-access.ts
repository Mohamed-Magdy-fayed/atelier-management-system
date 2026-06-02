import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";

import { BranchMembershipsTable } from "@/drizzle/schema";
import type { createTRPCContext } from "@/integrations/trpc/init";

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;
export type ProtectedTRPCSession = NonNullable<TRPCContext["session"]>;

export function assertOperationalStaff(role: string) {
  if (role !== "super_admin" && role !== "admin" && role !== "employee") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Insufficient permissions",
    });
  }
}

export function assertAdminRole(role: string) {
  if (role !== "super_admin" && role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin access required",
    });
  }
}

export async function assertUserCanAccessBranch(
  ctx: TRPCContext,
  session: ProtectedTRPCSession,
  branchId: string,
): Promise<void> {
  if (session.user.role === "super_admin" || session.user.role === "admin") {
    return;
  }

  const membership = await ctx.db.query.BranchMembershipsTable.findFirst({
    where: and(
      eq(BranchMembershipsTable.userId, session.user.id),
      eq(BranchMembershipsTable.branchId, branchId),
    ),
    columns: { branchId: true },
  });

  if (!membership) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have access to this branch",
    });
  }
}

/** Admins may omit branch (all-branches). Employees must pass an assigned active branch. */
export async function resolveListBranchId(
  ctx: TRPCContext,
  session: ProtectedTRPCSession,
  branchId?: string,
): Promise<string | undefined> {
  if (session.user.role === "super_admin" || session.user.role === "admin") {
    return branchId;
  }

  if (!branchId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Active branch is required",
    });
  }

  await assertUserCanAccessBranch(ctx, session, branchId);
  return branchId;
}
