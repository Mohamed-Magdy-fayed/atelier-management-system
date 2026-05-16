import { TRPCError } from "@trpc/server";
import { and, eq, ne } from "drizzle-orm";

import { BranchesTable, BranchMembershipsTable } from "@/drizzle/schema";
import { toDbTime } from "@/lib/branch-hours";
import { normalizeBranchShortCode } from "@/lib/branch-short-code";
import type {
  BranchDeleteInput,
  BranchMutationInput,
  BranchUpdateInput,
} from "./schemas";

import {
  assertAdminRole,
  getRequiredSession,
  type TRPCContext,
} from "./shared";

function nullableTrim(value: string | undefined): string | null {
  if (value === undefined) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

async function assertUniqueBranchShortCode(
  ctx: TRPCContext,
  shortCode: string,
  excludeBranchId?: string,
) {
  const existing = await ctx.db.query.BranchesTable.findFirst({
    columns: { id: true },
    where: excludeBranchId
      ? and(
          eq(BranchesTable.shortCode, shortCode),
          ne(BranchesTable.id, excludeBranchId),
        )
      : eq(BranchesTable.shortCode, shortCode),
  });

  if (existing) {
    throw new TRPCError({
      code: "CONFLICT",
      message: ctx.t("systemPages.branchShortCodeDuplicate"),
    });
  }
}

export async function createBranch(
  ctx: TRPCContext,
  input: BranchMutationInput,
) {
  const session = getRequiredSession(ctx);
  assertAdminRole(session.user.role);

  const shortCode = normalizeBranchShortCode(input.shortCode);
  await assertUniqueBranchShortCode(ctx, shortCode);

  const branchId = await ctx.db.transaction(async (trx) => {
    const [branch] = await trx
      .insert(BranchesTable)
      .values({
        shortCode,
        nameEn: input.nameEn.trim(),
        nameAr: input.nameAr.trim(),
        addressEn: nullableTrim(input.addressEn),
        addressAr: nullableTrim(input.addressAr),
        phone: nullableTrim(input.phone),
        opensAt: toDbTime(input.opensAt),
        closesAt: toDbTime(input.closesAt),
        mapUrl: nullableTrim(input.mapUrl),
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

export async function updateBranch(ctx: TRPCContext, input: BranchUpdateInput) {
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

  const shortCode = normalizeBranchShortCode(input.shortCode);
  await assertUniqueBranchShortCode(ctx, shortCode, input.id);

  await ctx.db
    .update(BranchesTable)
    .set({
      shortCode,
      nameEn: input.nameEn.trim(),
      nameAr: input.nameAr.trim(),
      addressEn: nullableTrim(input.addressEn),
      addressAr: nullableTrim(input.addressAr),
      phone: nullableTrim(input.phone),
      opensAt: toDbTime(input.opensAt),
      closesAt: toDbTime(input.closesAt),
      mapUrl: nullableTrim(input.mapUrl),
    })
    .where(eq(BranchesTable.id, input.id));

  return { updated: true };
}

export async function deleteBranch(ctx: TRPCContext, input: BranchDeleteInput) {
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
