import { TRPCError } from "@trpc/server";
import { eq, inArray } from "drizzle-orm";

import { SettingsTable } from "@/drizzle/schema";
import {
  getSystemSettingDefinition,
  isBrandingSettingCode,
  isSystemSettingCode,
  SYSTEM_SETTING_CODE,
} from "@/features/system/settings/lib/system-settings-registry";
import { handleDatabaseError } from "@/integrations/trpc/db-error";

import { isBrandingEditable } from "./branding";

import { encryptSecret, SettingSecretError } from "./secret-crypto";

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

/**
 * Branding is locked by contract, not by UI.
 *
 * The Settings screen hides the affordance, but `settings.update` is reachable
 * by a direct tRPC call from any signed-in admin — so the UI must not be the
 * only guard, or the lock is decorative.
 */
function assertBrandingEditable(code: string): void {
  if (!isBrandingSettingCode(code)) return;
  if (isBrandingEditable()) return;

  throw new TRPCError({
    code: "FORBIDDEN",
    message: "Branding is not editable on this plan",
  });
}

/**
 * The logo URL is rendered straight into an `img src`, so the scheme is a
 * security boundary rather than a formatting preference: `javascript:` and
 * `data:` both execute or embed in that position.
 */
function assertHttpsUrl(value: string): void {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Logo URL must be a full URL, starting with https://",
    });
  }

  if (parsed.protocol !== "https:") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Logo URL must start with https://",
    });
  }
}

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

  assertBrandingEditable(code);

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

    const trimmed = input.value?.trim() || null;

    if (trimmed && def.valueEnum && !def.valueEnum.includes(trimmed)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Value must be one of: ${def.valueEnum.join(", ")}`,
      });
    }

    if (trimmed && code === SYSTEM_SETTING_CODE.BRAND_LOGO_URL) {
      assertHttpsUrl(trimmed);
    }

    // Encrypted here rather than at the call site so no future caller can
    // write a credential in the clear by forgetting.
    if (trimmed && def.isSecret) {
      try {
        patch.value = encryptSecret(trimmed);
      } catch (err) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            err instanceof SettingSecretError
              ? err.message
              : "Could not store this credential",
        });
      }
    } else {
      patch.value = trimmed;
    }
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

  assertBrandingEditable(existing.code);

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
    assertBrandingEditable(row.code);
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
