import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import { SettingsTable } from "@/drizzle/schema";
import { handleDatabaseError } from "@/integrations/trpc/db-error";

import type {
  SettingDeleteInput,
  SettingMutationInput,
  SettingUpdateInput,
} from "./schemas";
import {
  assertAdminRole,
  getRequiredSession,
  type TRPCContext,
} from "./shared";

export async function createSetting(ctx: TRPCContext, input: SettingMutationInput) {
  const session = getRequiredSession(ctx);
  assertAdminRole(session.user.role);

  try {
    const [row] = await ctx.db
      .insert(SettingsTable)
      .values({
        code: input.code.trim(),
        label: input.label,
        description: input.description?.trim() || null,
        isActive: input.isActive,
        value: input.value?.trim() || null,
        amount: input.amount ?? null,
        createdBy: session.user.id,
      })
      .returning({ id: SettingsTable.id });

    if (!row) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    }

    return { settingId: row.id };
  } catch (err) {
    throw handleDatabaseError(err);
  }
}

export async function updateSetting(ctx: TRPCContext, input: SettingUpdateInput) {
  const session = getRequiredSession(ctx);
  assertAdminRole(session.user.role);

  const existing = await ctx.db.query.SettingsTable.findFirst({
    columns: { id: true },
    where: eq(SettingsTable.id, input.id),
  });

  if (!existing) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Setting not found",
    });
  }

  try {
    await ctx.db
      .update(SettingsTable)
      .set({
        label: input.label,
        description: input.description?.trim() || null,
        isActive: input.isActive,
        value: input.value?.trim() || null,
        amount: input.amount ?? null,
        updatedBy: session.user.id,
      })
      .where(eq(SettingsTable.id, input.id));

    return { updated: true };
  } catch (err) {
    throw handleDatabaseError(err);
  }
}

export async function deleteSetting(ctx: TRPCContext, input: SettingDeleteInput) {
  const session = getRequiredSession(ctx);
  assertAdminRole(session.user.role);

  const existing = await ctx.db.query.SettingsTable.findFirst({
    columns: { id: true },
    where: eq(SettingsTable.id, input.id),
  });

  if (!existing) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Setting not found",
    });
  }

  try {
    await ctx.db.delete(SettingsTable).where(eq(SettingsTable.id, input.id));
    return { deleted: true };
  } catch (err) {
    throw handleDatabaseError(err);
  }
}
