import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

import {
  BranchesTable,
  BranchMembershipsTable,
} from "@/drizzle/schema";

import type {
  BranchDeleteInput,
  BranchMutationInput,
  BranchUpdateInput,
} from "./schemas";
import { assertAdminRole, getRequiredSession, type TRPCContext } from "./shared";

export async function createBranch(ctx: TRPCContext, input: BranchMutationInput) {
  const session = getRequiredSession(ctx);
  assertAdminRole(session.user.role);

  const branchId = await ctx.db.transaction(async (trx) => {
    const [branch] = await trx
      .insert(BranchesTable)
      .values({
        nameEn: input.nameEn.trim(),
        nameAr: input.nameAr.trim(),
        ownerId: session.user.id,
      })
      .returning({ id: BranchesTable.id });

    await trx
      .insert(BranchMembershipsTable)
      .values({
        branchId: branch.id,
        userId: session.user.id,
        isCurrent: false,
      })
      .onConflictDoNothing();

    return branch.id;
  });

  return { branchId };
}

export async function updateBranch(
  ctx: TRPCContext,
  input: BranchUpdateInput,
) {
  const session = getRequiredSession(ctx);
  assertAdminRole(session.user.role);

  const branch = await ctx.db.query.BranchesTable.findFirst({
    columns: { id: true },
    where: eq(BranchesTable.id, input.id),
  });

  if (!branch) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: ctx.t("authTranslations.branch.actions.updateBranch.notFound"),
    });
  }

  await ctx.db
    .update(BranchesTable)
    .set({
      nameEn: input.nameEn.trim(),
      nameAr: input.nameAr.trim(),
    })
    .where(eq(BranchesTable.id, input.id));

  return { updated: true };
}

export async function deleteBranch(
  ctx: TRPCContext,
  input: BranchDeleteInput,
) {
  const session = getRequiredSession(ctx);
  assertAdminRole(session.user.role);

  const branch = await ctx.db.query.BranchesTable.findFirst({
    columns: { id: true },
    where: eq(BranchesTable.id, input.id),
  });

  if (!branch) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: ctx.t("authTranslations.branch.actions.deleteBranch.notFound"),
    });
  }

  await ctx.db.delete(BranchesTable).where(eq(BranchesTable.id, input.id));

  return { deleted: true };
}
