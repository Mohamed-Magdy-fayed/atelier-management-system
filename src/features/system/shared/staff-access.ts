import { TRPCError } from "@trpc/server";
import { and, eq, inArray, isNull } from "drizzle-orm";

import {
  BranchMembershipsTable,
  DressesTable,
  ReservationsTable,
} from "@/drizzle/schema";
import type { createTRPCContext } from "@/integrations/trpc/init";

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;
export type ProtectedTRPCSession = NonNullable<TRPCContext["session"]>;

export function assertOperationalStaff(role: string) {
  if (role !== "admin" && role !== "employee") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Insufficient permissions",
    });
  }
}

export async function assertUserCanAccessBranch(
  ctx: TRPCContext,
  session: ProtectedTRPCSession,
  branchId: string,
): Promise<void> {
  if (session.user.role === "admin") {
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
  if (session.user.role === "admin") {
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

export async function assertDressIdsAccessible(
  ctx: TRPCContext,
  session: ProtectedTRPCSession,
  ids: string[],
): Promise<void> {
  if (session.user.role === "admin" || ids.length === 0) {
    return;
  }

  const rows = await ctx.db
    .select({ branchId: DressesTable.branchId })
    .from(DressesTable)
    .where(and(inArray(DressesTable.id, ids), isNull(DressesTable.deletedAt)));

  if (rows.length !== ids.length) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Dress not found",
    });
  }

  for (const row of rows) {
    await assertUserCanAccessBranch(ctx, session, row.branchId);
  }
}

export async function assertReservationIdsAccessible(
  ctx: TRPCContext,
  session: ProtectedTRPCSession,
  ids: string[],
): Promise<void> {
  if (session.user.role === "admin" || ids.length === 0) {
    return;
  }

  const rows = await ctx.db
    .select({ branchId: ReservationsTable.branchId })
    .from(ReservationsTable)
    .where(
      and(inArray(ReservationsTable.id, ids), isNull(ReservationsTable.deletedAt)),
    );

  if (rows.length !== ids.length) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Reservation not found",
    });
  }

  for (const row of rows) {
    await assertUserCanAccessBranch(ctx, session, row.branchId);
  }
}
