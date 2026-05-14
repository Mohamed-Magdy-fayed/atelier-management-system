import { TRPCError } from "@trpc/server";
import { and, eq, inArray, isNull, ne } from "drizzle-orm";

import { ProductsTable } from "@/drizzle/schema";

import type {
  ProductBulkArchiveInput,
  ProductBulkSetActiveInput,
  ProductDeleteInput,
  ProductMutationInput,
  ProductSetActiveInput,
  ProductUpdateInput,
} from "./schemas";
import {
  assertAdminRole,
  getRequiredSession,
  type TRPCContext,
} from "./shared";

function normalizeCode(code: string) {
  return code.trim().toUpperCase();
}

async function ensureUniqueActiveCode(
  ctx: TRPCContext,
  code: string,
  currentId?: string,
) {
  const existing = await ctx.db.query.ProductsTable.findFirst({
    columns: { id: true },
    where: currentId
      ? and(
          eq(ProductsTable.code, code),
          isNull(ProductsTable.deletedAt),
          ne(ProductsTable.id, currentId),
        )
      : and(eq(ProductsTable.code, code), isNull(ProductsTable.deletedAt)),
  });

  if (existing) {
    throw new TRPCError({
      code: "CONFLICT",
      message: ctx.t("systemPages.productCodeDuplicate"),
    });
  }
}

export async function createProduct(
  ctx: TRPCContext,
  input: ProductMutationInput,
) {
  const session = getRequiredSession(ctx);
  assertAdminRole(session.user.role);

  const code = normalizeCode(input.code);
  await ensureUniqueActiveCode(ctx, code);

  const [product] = await ctx.db
    .insert(ProductsTable)
    .values({
      code,
      nameEn: input.nameEn.trim(),
      nameAr: input.nameAr.trim(),
      price: input.price,
      isActive: input.isActive,
      createdBy: session.user.id,
    })
    .returning({ id: ProductsTable.id });

  return { productId: product.id };
}

export async function updateProduct(
  ctx: TRPCContext,
  input: ProductUpdateInput,
) {
  const session = getRequiredSession(ctx);
  assertAdminRole(session.user.role);

  const product = await ctx.db.query.ProductsTable.findFirst({
    columns: { id: true },
    where: and(eq(ProductsTable.id, input.id), isNull(ProductsTable.deletedAt)),
  });

  if (!product) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: ctx.t("systemPages.productNotFound"),
    });
  }

  const code = normalizeCode(input.code);
  await ensureUniqueActiveCode(ctx, code, input.id);

  await ctx.db
    .update(ProductsTable)
    .set({
      code,
      nameEn: input.nameEn.trim(),
      nameAr: input.nameAr.trim(),
      price: input.price,
      isActive: input.isActive,
      updatedBy: session.user.id,
    })
    .where(eq(ProductsTable.id, input.id));

  return { updated: true };
}

export async function deleteProduct(
  ctx: TRPCContext,
  input: ProductDeleteInput,
) {
  const session = getRequiredSession(ctx);
  assertAdminRole(session.user.role);

  const product = await ctx.db.query.ProductsTable.findFirst({
    columns: { id: true },
    where: and(eq(ProductsTable.id, input.id), isNull(ProductsTable.deletedAt)),
  });

  if (!product) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: ctx.t("systemPages.productNotFound"),
    });
  }

  await ctx.db
    .update(ProductsTable)
    .set({
      deletedAt: new Date(),
      deletedBy: session.user.id,
      updatedBy: session.user.id,
    })
    .where(eq(ProductsTable.id, input.id));

  return { deleted: true };
}

export async function setProductActive(
  ctx: TRPCContext,
  input: ProductSetActiveInput,
) {
  const session = getRequiredSession(ctx);
  assertAdminRole(session.user.role);

  const product = await ctx.db.query.ProductsTable.findFirst({
    columns: { id: true },
    where: and(eq(ProductsTable.id, input.id), isNull(ProductsTable.deletedAt)),
  });

  if (!product) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: ctx.t("systemPages.productNotFound"),
    });
  }

  await ctx.db
    .update(ProductsTable)
    .set({
      isActive: input.isActive,
      updatedBy: session.user.id,
    })
    .where(eq(ProductsTable.id, input.id));

  return { updated: true };
}

export async function bulkSetProductsActive(
  ctx: TRPCContext,
  input: ProductBulkSetActiveInput,
) {
  const session = getRequiredSession(ctx);
  assertAdminRole(session.user.role);

  await ctx.db
    .update(ProductsTable)
    .set({
      isActive: input.isActive,
      updatedBy: session.user.id,
    })
    .where(
      and(
        inArray(ProductsTable.id, input.ids),
        isNull(ProductsTable.deletedAt),
      ),
    );

  return { updated: true };
}

export async function bulkArchiveProducts(
  ctx: TRPCContext,
  input: ProductBulkArchiveInput,
) {
  const session = getRequiredSession(ctx);
  assertAdminRole(session.user.role);

  await ctx.db
    .update(ProductsTable)
    .set({
      isActive: false,
      deletedAt: new Date(),
      deletedBy: session.user.id,
      updatedBy: session.user.id,
    })
    .where(
      and(
        inArray(ProductsTable.id, input.ids),
        isNull(ProductsTable.deletedAt),
      ),
    );

  return { deleted: true };
}
