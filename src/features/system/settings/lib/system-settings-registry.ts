import type { SettingsLabel } from "@/drizzle/schemas/system/settings-table";

import { DEFAULT_RESERVATION_USAGE_POLICY } from "./default-reservation-usage-policy";

export { DEFAULT_RESERVATION_USAGE_POLICY };

/** Default IANA timezone when setting `00002` is unset or inactive. */
export const DEFAULT_BUSINESS_TIMEZONE = "Africa/Cairo";

/** Fixed system setting codes (policy / integration parameters). */
export const SYSTEM_SETTING_CODE = {
  SHOW_CATALOG_PRICES: "00001",
  BUSINESS_TIMEZONE: "00002",
  RESERVATION_USAGE_POLICY: "00003",
  SHOW_AVAILABILITY_CALENDAR: "00004",
  WHATSAPP_NUMBER: "00005",
} as const;

export type SystemSettingCode =
  (typeof SYSTEM_SETTING_CODE)[keyof typeof SYSTEM_SETTING_CODE];

export const SYSTEM_SETTING_CODES: SystemSettingCode[] = [
  SYSTEM_SETTING_CODE.SHOW_CATALOG_PRICES,
  SYSTEM_SETTING_CODE.BUSINESS_TIMEZONE,
  SYSTEM_SETTING_CODE.RESERVATION_USAGE_POLICY,
  SYSTEM_SETTING_CODE.SHOW_AVAILABILITY_CALENDAR,
  SYSTEM_SETTING_CODE.WHATSAPP_NUMBER,
];

const LEGACY_SETTING_CODES = {
  HIDE_CATALOG_PRICES: "PUBLIC_HIDE_CATALOG_PRICES",
  BUSINESS_TIMEZONE: "PUBLIC_BUSINESS_TIMEZONE",
} as const;

export type SystemSettingDefinition = {
  code: SystemSettingCode;
  label: SettingsLabel;
  /** i18n key under `systemPages` */
  nameKey:
    | "settingName00001"
    | "settingName00002"
    | "settingName00003"
    | "settingName00004"
    | "settingName00005";
  /** i18n key under `systemPages` */
  descriptionKey:
    | "settingDesc00001"
    | "settingDesc00002"
    | "settingDesc00003"
    | "settingDesc00004"
    | "settingDesc00005";
  /** English fallback stored in DB on seed (not user-editable). */
  descriptionEn: string;
  editable: {
    isActive?: boolean;
    value?: boolean;
    amount?: boolean;
  };
  seed: {
    isActive: boolean | null;
    value?: string | null;
    amount?: number | null;
  };
};

export const SYSTEM_SETTINGS: SystemSettingDefinition[] = [
  {
    code: SYSTEM_SETTING_CODE.SHOW_CATALOG_PRICES,
    label: "policy",
    nameKey: "settingName00001",
    descriptionKey: "settingDesc00001",
    descriptionEn:
      "When enabled, rental prices are shown on the public home page, browse catalog, and dress detail.",
    editable: { isActive: true },
    seed: { isActive: true },
  },
  {
    code: SYSTEM_SETTING_CODE.BUSINESS_TIMEZONE,
    label: "integration",
    nameKey: "settingName00002",
    descriptionKey: "settingDesc00002",
    descriptionEn:
      "IANA timezone used for public dress availability and calendar-day checks.",
    editable: { isActive: true, value: true },
    seed: { isActive: true, value: DEFAULT_BUSINESS_TIMEZONE },
  },
  {
    code: SYSTEM_SETTING_CODE.RESERVATION_USAGE_POLICY,
    label: "policy",
    nameKey: "settingName00003",
    descriptionKey: "settingDesc00003",
    descriptionEn:
      "Default usage policy text printed on reservation receipts when no custom hint is set.",
    editable: { isActive: true, value: true },
    seed: { isActive: true, value: DEFAULT_RESERVATION_USAGE_POLICY },
  },
  {
    code: SYSTEM_SETTING_CODE.SHOW_AVAILABILITY_CALENDAR,
    label: "policy",
    nameKey: "settingName00004",
    descriptionKey: "settingDesc00004",
    descriptionEn:
      "When enabled, a date-availability calendar is shown on dress detail pages so customers can check if a dress is free before visiting the store.",
    editable: { isActive: true },
    seed: { isActive: true },
  },
  {
    code: SYSTEM_SETTING_CODE.WHATSAPP_NUMBER,
    label: "integration",
    nameKey: "settingName00005",
    descriptionKey: "settingDesc00005",
    descriptionEn:
      "Phone number used for the WhatsApp contact button on public dress detail and locations pages. Overrides the branch-level phone. Store in local format (e.g. 01xxxxxxxxx).",
    editable: { isActive: true, value: true },
    seed: { isActive: true, value: null },
  },
];

export function getSystemSettingDefinition(
  code: string,
): SystemSettingDefinition | undefined {
  return SYSTEM_SETTINGS.find((row) => row.code === code);
}

export function isSystemSettingCode(code: string): code is SystemSettingCode {
  return SYSTEM_SETTING_CODES.includes(code as SystemSettingCode);
}

export const LEGACY_SETTING_CODE_VALUES = Object.values(LEGACY_SETTING_CODES);
