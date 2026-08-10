import { and, asc, eq, inArray } from "drizzle-orm";

import { BranchMembershipsTable, BranchesTable } from "@/drizzle/schema";

import type { TRPCContext, UsersDb } from "./shared";

export async function getUserBranchIds(
  ctx: TRPCContext,
  userId: string,
): Promise<string[]> {
  const rows = await ctx.db
    .select({ branchId: BranchMembershipsTable.branchId })
    .from(BranchMembershipsTable)
    .where(eq(BranchMembershipsTable.userId, userId));

  return rows.map((row) => row.branchId);
}

export async function listAssignableBranches(ctx: TRPCContext) {
  return ctx.db
    .select({
      id: BranchesTable.id,
      nameEn: BranchesTable.nameEn,
      nameAr: BranchesTable.nameAr,
    })
    .from(BranchesTable)
    .orderBy(asc(BranchesTable.nameEn));
}

export async function syncUserBranchMemberships(
  db: UsersDb,
  userId: string,
  branchIds: string[],
) {
  const uniqueBranchIds = Array.from(new Set(branchIds));

  const existing = await db
    .select({
      branchId: BranchMembershipsTable.branchId,
      isCurrent: BranchMembershipsTable.isCurrent,
    })
    .from(BranchMembershipsTable)
    .where(eq(BranchMembershipsTable.userId, userId));

  const existingIds = existing.map((row) => row.branchId);
  const toAdd = uniqueBranchIds.filter((id) => !existingIds.includes(id));
  const toRemove = existingIds.filter((id) => !uniqueBranchIds.includes(id));
  const hadCurrent = existing.some((row) => row.isCurrent);

  if (toAdd.length > 0) {
    await db.insert(BranchMembershipsTable).values(
      toAdd.map((branchId, index) => ({
        branchId,
        userId,
        isCurrent: !hadCurrent && index === 0 ? true : null,
      })),
    );
  }

  if (toRemove.length > 0) {
    await db
      .delete(BranchMembershipsTable)
      .where(
        and(
          eq(BranchMembershipsTable.userId, userId),
          inArray(BranchMembershipsTable.branchId, toRemove),
        ),
      );
  }

  const remaining = await db
    .select({ branchId: BranchMembershipsTable.branchId })
    .from(BranchMembershipsTable)
    .where(eq(BranchMembershipsTable.userId, userId));

  if (remaining.length === 0) {
    return;
  }

  const stillHasCurrent = await db.query.BranchMembershipsTable.findFirst({
    where: and(
      eq(BranchMembershipsTable.userId, userId),
      eq(BranchMembershipsTable.isCurrent, true),
    ),
    columns: { branchId: true },
  });

  if (!stillHasCurrent) {
    await db
      .update(BranchMembershipsTable)
      .set({ isCurrent: true })
      .where(
        and(
          eq(BranchMembershipsTable.userId, userId),
          eq(BranchMembershipsTable.branchId, remaining[0].branchId),
        ),
      );
  }
}

export function resolveBranchIds(input: {
  branchIds?: string[];
  branchId?: string;
}): string[] {
  if (input.branchIds?.length) {
    return Array.from(new Set(input.branchIds));
  }
  if (input.branchId) {
    return [input.branchId];
  }
  return [];
}
