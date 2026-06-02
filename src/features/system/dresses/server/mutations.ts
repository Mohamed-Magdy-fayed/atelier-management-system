import { TRPCError } from "@trpc/server";
import { and, eq, inArray, isNull, ne } from "drizzle-orm";

import { DressesTable } from "@/drizzle/schema";

import type {
  DressBulkArchiveInput,
  DressBulkSetActiveInput,
  DressDeleteInput,
  DressMutationInput,
  DressSetActiveInput,
  DressUpdateInput,
} from "./schemas";
import {
  assertDressIdsAccessible,
  assertOperationalStaff,
  assertUserCanAccessBranch,
} from "@/features/system/shared/staff-access";

import { getRequiredSession, type TRPCContext } from "./shared";

function normalizeCode(code: string) {
  return code.trim().toUpperCase();
}

async function ensureUniqueActiveCode(
  ctx: TRPCContext,
  code: string,
  currentId?: string,
) {
  const existing = await ctx.db.query.DressesTable.findFirst({
    columns: { id: true },
    where: currentId
      ? and(
          eq(DressesTable.code, code),
          isNull(DressesTable.deletedAt),
          ne(DressesTable.id, currentId),
        )
      : and(eq(DressesTable.code, code), isNull(DressesTable.deletedAt)),
  });

  if (existing) {
    throw new TRPCError({
      code: "CONFLICT",
      message: ctx.t("systemPages.dressCodeDuplicate"),
    });
  }
}

export async function createDress(ctx: TRPCContext, input: DressMutationInput) {
  const session = getRequiredSession(ctx);
  assertOperationalStaff(session.user.role);
  await assertUserCanAccessBranch(ctx, session, input.branchId);

  const code = normalizeCode(input.code);
  await ensureUniqueActiveCode(ctx, code);

  const imageUrls =
    input.images?.map((u) => u.trim()).filter(Boolean) ?? [];

  const [dress] = await ctx.db
    .insert(DressesTable)
    .values({
      branchId: input.branchId,
      code,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      images: imageUrls.length > 0 ? imageUrls : null,
      size: input.size?.trim() || null,
      color: input.color?.trim() || null,
      pricePerDay: input.pricePerDay,
      depositAmount: input.depositAmount,
      insurance: input.insurance,
      isActive: input.isActive,
      createdBy: session.user.id,
    })
    .returning({ id: DressesTable.id });

  return { dressId: dress.id };
}

export async function updateDress(ctx: TRPCContext, input: DressUpdateInput) {
  const session = getRequiredSession(ctx);
  assertOperationalStaff(session.user.role);

  const dress = await ctx.db.query.DressesTable.findFirst({
    columns: { id: true, branchId: true },
    where: and(eq(DressesTable.id, input.id), isNull(DressesTable.deletedAt)),
  });

  if (!dress) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: ctx.t("systemPages.dressNotFound"),
    });
  }

  await assertUserCanAccessBranch(ctx, session, dress.branchId);
  await assertUserCanAccessBranch(ctx, session, input.branchId);
  if (
    session.user.role === "employee" &&
    input.branchId !== dress.branchId
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Employees cannot move dresses to another branch",
    });
  }

  const code = normalizeCode(input.code);
  await ensureUniqueActiveCode(ctx, code, input.id);

  const imageUrls =
    input.images?.map((u) => u.trim()).filter(Boolean) ?? [];

  await ctx.db
    .update(DressesTable)
    .set({
      branchId: input.branchId,
      code,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      images: imageUrls.length > 0 ? imageUrls : null,
      size: input.size?.trim() || null,
      color: input.color?.trim() || null,
      pricePerDay: input.pricePerDay,
      depositAmount: input.depositAmount,
      insurance: input.insurance,
      isActive: input.isActive,
      updatedBy: session.user.id,
    })
    .where(eq(DressesTable.id, input.id));

  return { updated: true };
}

export async function deleteDress(ctx: TRPCContext, input: DressDeleteInput) {
  const session = getRequiredSession(ctx);
  assertOperationalStaff(session.user.role);

  const dress = await ctx.db.query.DressesTable.findFirst({
    columns: { id: true, branchId: true },
    where: and(eq(DressesTable.id, input.id), isNull(DressesTable.deletedAt)),
  });

  if (!dress) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: ctx.t("systemPages.dressNotFound"),
    });
  }

  await assertUserCanAccessBranch(ctx, session, dress.branchId);

  await ctx.db
    .update(DressesTable)
    .set({
      deletedAt: new Date(),
      deletedBy: session.user.id,
      updatedBy: session.user.id,
    })
    .where(eq(DressesTable.id, input.id));

  return { deleted: true };
}

export async function setDressActive(
  ctx: TRPCContext,
  input: DressSetActiveInput,
) {
  const session = getRequiredSession(ctx);
  assertOperationalStaff(session.user.role);

  const dress = await ctx.db.query.DressesTable.findFirst({
    columns: { id: true, branchId: true },
    where: and(eq(DressesTable.id, input.id), isNull(DressesTable.deletedAt)),
  });

  if (!dress) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: ctx.t("systemPages.dressNotFound"),
    });
  }

  await assertUserCanAccessBranch(ctx, session, dress.branchId);

  await ctx.db
    .update(DressesTable)
    .set({
      isActive: input.isActive,
      updatedBy: session.user.id,
    })
    .where(eq(DressesTable.id, input.id));

  return { updated: true };
}

export async function bulkSetDressesActive(
  ctx: TRPCContext,
  input: DressBulkSetActiveInput,
) {
  const session = getRequiredSession(ctx);
  assertOperationalStaff(session.user.role);
  await assertDressIdsAccessible(ctx, session, input.ids);

  await ctx.db
    .update(DressesTable)
    .set({
      isActive: input.isActive,
      updatedBy: session.user.id,
    })
    .where(
      and(inArray(DressesTable.id, input.ids), isNull(DressesTable.deletedAt)),
    );

  return { updated: true };
}

export async function bulkArchiveDresses(
  ctx: TRPCContext,
  input: DressBulkArchiveInput,
) {
  const session = getRequiredSession(ctx);
  assertOperationalStaff(session.user.role);
  await assertDressIdsAccessible(ctx, session, input.ids);

  await ctx.db
    .update(DressesTable)
    .set({
      isActive: false,
      deletedAt: new Date(),
      deletedBy: session.user.id,
      updatedBy: session.user.id,
    })
    .where(
      and(inArray(DressesTable.id, input.ids), isNull(DressesTable.deletedAt)),
    );

  return { deleted: true };
}
