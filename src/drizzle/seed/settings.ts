import { and, eq, notInArray, or, sql } from "drizzle-orm";

import { db } from "@/drizzle";
import { SettingsTable } from "@/drizzle/schema";
import { DEFAULT_RESERVATION_USAGE_POLICY } from "@/features/system/settings/lib/default-reservation-usage-policy";
import {
  mapLegacySettingRow,
  pickLegacyUsagePolicyValue,
} from "@/features/system/settings/lib/legacy-setting-map";
import {
  LEGACY_SETTING_CODE_VALUES,
  SYSTEM_SETTINGS,
  SYSTEM_SETTING_CODE,
  SYSTEM_SETTING_CODES,
} from "@/features/system/settings/lib/system-settings-registry";

type DbClient = Pick<typeof db, "insert" | "update" | "delete" | "query">;

/**
 * Default `settings` rows for seed profiles. Upserts metadata on `code`;
 * applies default policy text for `00003` when value is empty.
 */
export function buildDefaultSettingsSeedRows(
  createdBy: string,
): Array<typeof SettingsTable.$inferInsert> {
  return SYSTEM_SETTINGS.map((def) => ({
    code: def.code,
    label: def.label,
    description: def.descriptionEn,
    isActive: def.seed.isActive,
    value: def.seed.value ?? null,
    amount: def.seed.amount ?? null,
    createdBy,
  }));
}

async function migrateLegacySettingCodes(
  tx: DbClient,
  legacyPolicyValue: string | null,
): Promise<void> {
  const hideLegacy = await tx.query.SettingsTable.findFirst({
    where: eq(SettingsTable.code, "PUBLIC_HIDE_CATALOG_PRICES"),
  });
  const showRow = await tx.query.SettingsTable.findFirst({
    where: eq(SettingsTable.code, SYSTEM_SETTING_CODE.SHOW_CATALOG_PRICES),
  });

  if (hideLegacy && !showRow) {
    await tx
      .update(SettingsTable)
      .set({
        code: SYSTEM_SETTING_CODE.SHOW_CATALOG_PRICES,
        isActive:
          hideLegacy.isActive === null ? true : hideLegacy.isActive !== true,
      })
      .where(eq(SettingsTable.id, hideLegacy.id));
  } else if (hideLegacy && showRow) {
    await tx
      .delete(SettingsTable)
      .where(eq(SettingsTable.id, hideLegacy.id));
  }

  const tzLegacy = await tx.query.SettingsTable.findFirst({
    where: eq(SettingsTable.code, "PUBLIC_BUSINESS_TIMEZONE"),
  });
  const tzRow = await tx.query.SettingsTable.findFirst({
    where: eq(SettingsTable.code, SYSTEM_SETTING_CODE.BUSINESS_TIMEZONE),
  });

  if (tzLegacy && !tzRow) {
    await tx
      .update(SettingsTable)
      .set({ code: SYSTEM_SETTING_CODE.BUSINESS_TIMEZONE })
      .where(eq(SettingsTable.id, tzLegacy.id));
  } else if (tzLegacy && tzRow) {
    await tx.delete(SettingsTable).where(eq(SettingsTable.id, tzLegacy.id));
  }

  const orphanRows = await tx.query.SettingsTable.findMany({
    columns: {
      id: true,
      code: true,
      label: true,
      description: true,
      isActive: true,
      value: true,
      amount: true,
    },
    where: notInArray(SettingsTable.code, [...SYSTEM_SETTING_CODES]),
  });

  for (const row of orphanRows) {
    const mapped = mapLegacySettingRow(row);
    if (!mapped) {
      await tx.delete(SettingsTable).where(eq(SettingsTable.id, row.id));
      continue;
    }

    const target = await tx.query.SettingsTable.findFirst({
      where: eq(SettingsTable.code, mapped.code),
    });

    if (!target) {
      await tx
        .update(SettingsTable)
        .set({
          code: mapped.code,
          label: mapped.label,
          description: mapped.description,
          isActive: mapped.isActive,
          value: mapped.value,
          amount: mapped.amount,
        })
        .where(eq(SettingsTable.id, row.id));
      continue;
    }

    if (mapped.code === SYSTEM_SETTING_CODE.RESERVATION_USAGE_POLICY) {
      const value =
        mapped.value?.trim() ||
        legacyPolicyValue ||
        target.value?.trim() ||
        DEFAULT_RESERVATION_USAGE_POLICY;
      if (!target.value?.trim() && value) {
        await tx
          .update(SettingsTable)
          .set({ value })
          .where(eq(SettingsTable.id, target.id));
      }
    }

    await tx.delete(SettingsTable).where(eq(SettingsTable.id, row.id));
  }
}

async function applyUsagePolicyDefault(
  tx: DbClient,
  createdBy: string,
  legacyPolicyValue: string | null,
): Promise<void> {
  const policyDef = SYSTEM_SETTINGS.find(
    (def) => def.code === SYSTEM_SETTING_CODE.RESERVATION_USAGE_POLICY,
  );
  const policyValue =
    legacyPolicyValue?.trim() || DEFAULT_RESERVATION_USAGE_POLICY;

  await tx
    .insert(SettingsTable)
    .values({
      code: SYSTEM_SETTING_CODE.RESERVATION_USAGE_POLICY,
      label: "policy",
      description: policyDef?.descriptionEn,
      isActive: true,
      value: policyValue,
      createdBy,
    })
    .onConflictDoUpdate({
      target: SettingsTable.code,
      set: {
        label: "policy",
        description: policyDef?.descriptionEn,
        value: sql`coalesce(nullif(trim(${SettingsTable.value}), ''), ${policyValue})`,
      },
    });
}

export async function seedDefaultSettings(
  tx: DbClient,
  createdBy: string,
): Promise<void> {
  const existingRows = await tx.query.SettingsTable.findMany({
    columns: { code: true, label: true, value: true },
  });
  const legacyPolicyValue = pickLegacyUsagePolicyValue(existingRows);

  await migrateLegacySettingCodes(tx, legacyPolicyValue);

  for (const row of buildDefaultSettingsSeedRows(createdBy)) {
    if (row.code === SYSTEM_SETTING_CODE.RESERVATION_USAGE_POLICY) {
      continue;
    }

    await tx
      .insert(SettingsTable)
      .values(row)
      .onConflictDoUpdate({
        target: SettingsTable.code,
        set: {
          label: row.label,
          description: row.description,
        },
      });
  }

  await applyUsagePolicyDefault(tx, createdBy, legacyPolicyValue);

  for (const legacyCode of LEGACY_SETTING_CODE_VALUES) {
    await tx.delete(SettingsTable).where(eq(SettingsTable.code, legacyCode));
  }

  const rows = await tx.query.SettingsTable.findMany({
    columns: { id: true, code: true },
  });
  for (const row of rows) {
    if (!SYSTEM_SETTINGS.some((def) => def.code === row.code)) {
      await tx.delete(SettingsTable).where(eq(SettingsTable.id, row.id));
    }
  }

  await tx
    .update(SettingsTable)
    .set({ value: DEFAULT_RESERVATION_USAGE_POLICY })
    .where(
      and(
        eq(SettingsTable.code, SYSTEM_SETTING_CODE.RESERVATION_USAGE_POLICY),
        or(
          sql`${SettingsTable.value} IS NULL`,
          sql`trim(${SettingsTable.value}) = ''`,
        ),
      ),
    );
}
