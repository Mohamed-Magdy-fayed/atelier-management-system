import { TRPCError } from "@trpc/server";
import { eq, inArray } from "drizzle-orm";

import { SettingsTable } from "@/drizzle/schema";
import {
  getSystemSettingDefinition,
  isSystemSettingCode,
} from "@/features/system/settings/lib/system-settings-registry";
import { handleDatabaseError } from "@/integrations/trpc/db-error";

import type {
  SettingBulkSetActiveInput,
  SettingSetActiveInput,
  SettingUpdateInput,
} from "./schemas";
import {
  assertAdminRole,
  getRequiredSession,
  type TRPCContext,
} from "./shared";

function assertEditableFields(
  code: string,
  input: SettingUpdateInput,
): Partial<{
  isActive: boolean | null;
  value: string | null;
  amount: number | null;
}> {
  const def = getSystemSettingDefinition(code);
  if (!def) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Unknown system setting",
    });
  }

  const patch: Partial<{
    isActive: boolean | null;
    value: string | null;
    amount: number | null;
  }> = {};

  if (input.isActive !== undefined) {
    if (!def.editable.isActive) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "This setting cannot change status",
      });
    }
    patch.isActive = input.isActive;
  }

  if (input.value !== undefined) {
    if (!def.editable.value) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "This setting cannot change value",
      });
    }
    patch.value = input.value?.trim() || null;
  }

  if (input.amount !== undefined) {
    if (!def.editable.amount) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "This setting cannot change amount",
      });
    }
    patch.amount = input.amount ?? null;
  }

  if (Object.keys(patch).length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "No editable fields provided",
    });
  }

  return patch;
}

export async function updateSetting(
  ctx: TRPCContext,
  input: SettingUpdateInput,
) {
  const session = getRequiredSession(ctx);
  assertAdminRole(session.user.role);

  const existing = await ctx.db.query.SettingsTable.findFirst({
    columns: { id: true, code: true },
    where: eq(SettingsTable.id, input.id),
  });

  if (!existing) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Setting not found",
    });
  }

  if (!isSystemSettingCode(existing.code)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Setting not found",
    });
  }

  const patch = assertEditableFields(existing.code, input);

  try {
    await ctx.db
      .update(SettingsTable)
      .set({
        ...patch,
        updatedBy: session.user.id,
      })
      .where(eq(SettingsTable.id, input.id));

    return { updated: true };
  } catch (err) {
    throw handleDatabaseError(err);
  }
}

export async function setSettingActive(
  ctx: TRPCContext,
  input: SettingSetActiveInput,
) {
  const session = getRequiredSession(ctx);
  assertAdminRole(session.user.role);

  const existing = await ctx.db.query.SettingsTable.findFirst({
    columns: { id: true, code: true },
    where: eq(SettingsTable.id, input.id),
  });

  if (!existing) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Setting not found",
    });
  }

  const def = getSystemSettingDefinition(existing.code);
  if (!def?.editable.isActive) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This setting cannot change status",
    });
  }

  await ctx.db
    .update(SettingsTable)
    .set({
      isActive: input.isActive,
      updatedBy: session.user.id,
    })
    .where(eq(SettingsTable.id, input.id));

  return { updated: true };
}

export async function bulkSetSettingsActive(
  ctx: TRPCContext,
  input: SettingBulkSetActiveInput,
) {
  const session = getRequiredSession(ctx);
  assertAdminRole(session.user.role);

  const rows = await ctx.db.query.SettingsTable.findMany({
    columns: { id: true, code: true },
    where: inArray(SettingsTable.id, input.ids),
  });

  if (rows.length !== input.ids.length) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "One or more settings were not found",
    });
  }

  for (const row of rows) {
    const def = getSystemSettingDefinition(row.code);
    if (!def?.editable.isActive) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "One or more settings cannot change status",
      });
    }
  }

  await ctx.db
    .update(SettingsTable)
    .set({
      isActive: input.isActive,
      updatedBy: session.user.id,
    })
    .where(inArray(SettingsTable.id, input.ids));

  return { updated: true };
}
