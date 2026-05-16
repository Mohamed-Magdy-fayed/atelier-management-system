import type { SettingsLabel } from "@/drizzle/schemas/system/settings-table";

import { DEFAULT_RESERVATION_USAGE_POLICY } from "./default-reservation-usage-policy";
import {
  DEFAULT_BUSINESS_TIMEZONE,
  LEGACY_SETTING_CODE_VALUES,
  SYSTEM_SETTING_CODE,
  SYSTEM_SETTING_CODES,
  type SystemSettingCode,
} from "./system-settings-registry";

export type LegacySettingRow = {
  code: string;
  label: string;
  description: string | null;
  isActive: boolean | null;
  value: string | null;
  amount: number | null;
};

export type MappedSystemSetting = {
  code: SystemSettingCode;
  label: SettingsLabel;
  description: string | null;
  isActive: boolean | null;
  value: string | null;
  amount: number | null;
};

const LEGACY_HIDE_CODE = "PUBLIC_HIDE_CATALOG_PRICES";
const LEGACY_TIMEZONE_CODE = "PUBLIC_BUSINESS_TIMEZONE";

function isReservedCode(code: string): boolean {
  return (
    SYSTEM_SETTING_CODES.includes(code as SystemSettingCode) ||
    LEGACY_SETTING_CODE_VALUES.includes(
      code as (typeof LEGACY_SETTING_CODE_VALUES)[number],
    )
  );
}

/** Pick the best legacy usage-policy text before rows are deleted or re-coded. */
export function pickLegacyUsagePolicyValue(
  rows: Array<Pick<LegacySettingRow, "code" | "label" | "value">>,
): string | null {
  const policyCandidates: string[] = [];

  for (const row of rows) {
    const value = row.value?.trim();
    if (!value) continue;

    if (row.code === SYSTEM_SETTING_CODE.RESERVATION_USAGE_POLICY) {
      return value;
    }

    if (
      row.code === LEGACY_HIDE_CODE ||
      row.code === LEGACY_TIMEZONE_CODE ||
      row.code === SYSTEM_SETTING_CODE.SHOW_CATALOG_PRICES ||
      row.code === SYSTEM_SETTING_CODE.BUSINESS_TIMEZONE
    ) {
      continue;
    }

    if (row.label === "policy") {
      policyCandidates.push(value);
    }
  }

  if (policyCandidates.length > 0) {
    return policyCandidates.sort((a, b) => b.length - a.length)[0] ?? null;
  }

  for (const row of rows) {
    const value = row.value?.trim();
    if (!value || isReservedCode(row.code)) continue;
    return value;
  }

  return null;
}

/** Map a legacy `settings` row onto the fixed system codes (`00001`–`00003`). */
export function mapLegacySettingRow(
  row: LegacySettingRow,
): MappedSystemSetting | null {
  const code = row.code.trim();
  const description = row.description?.trim() || null;
  const amount = row.amount ?? null;

  if (code === LEGACY_HIDE_CODE) {
    return {
      code: SYSTEM_SETTING_CODE.SHOW_CATALOG_PRICES,
      label: "policy",
      description,
      isActive: row.isActive === null ? true : row.isActive !== true,
      value: null,
      amount,
    };
  }

  if (code === LEGACY_TIMEZONE_CODE) {
    return {
      code: SYSTEM_SETTING_CODE.BUSINESS_TIMEZONE,
      label: "integration",
      description,
      isActive: row.isActive ?? true,
      value: row.value?.trim() || DEFAULT_BUSINESS_TIMEZONE,
      amount,
    };
  }

  if (code === SYSTEM_SETTING_CODE.SHOW_CATALOG_PRICES) {
    return {
      code: SYSTEM_SETTING_CODE.SHOW_CATALOG_PRICES,
      label: "policy",
      description,
      isActive: row.isActive ?? true,
      value: null,
      amount,
    };
  }

  if (code === SYSTEM_SETTING_CODE.BUSINESS_TIMEZONE) {
    return {
      code: SYSTEM_SETTING_CODE.BUSINESS_TIMEZONE,
      label: "integration",
      description,
      isActive: row.isActive ?? true,
      value: row.value?.trim() || DEFAULT_BUSINESS_TIMEZONE,
      amount,
    };
  }

  if (code === SYSTEM_SETTING_CODE.RESERVATION_USAGE_POLICY) {
    return {
      code: SYSTEM_SETTING_CODE.RESERVATION_USAGE_POLICY,
      label: "policy",
      description,
      isActive: row.isActive ?? true,
      value: row.value?.trim() || DEFAULT_RESERVATION_USAGE_POLICY,
      amount,
    };
  }

  const policyValue = row.value?.trim();
  if (row.label === "policy" && policyValue) {
    return {
      code: SYSTEM_SETTING_CODE.RESERVATION_USAGE_POLICY,
      label: "policy",
      description,
      isActive: row.isActive ?? true,
      value: policyValue,
      amount,
    };
  }

  if (row.label === "integration") {
    return {
      code: SYSTEM_SETTING_CODE.BUSINESS_TIMEZONE,
      label: "integration",
      description,
      isActive: row.isActive ?? true,
      value: row.value?.trim() || DEFAULT_BUSINESS_TIMEZONE,
      amount,
    };
  }

  if (policyValue) {
    return {
      code: SYSTEM_SETTING_CODE.RESERVATION_USAGE_POLICY,
      label: "policy",
      description,
      isActive: row.isActive ?? true,
      value: policyValue,
      amount,
    };
  }

  return null;
}
