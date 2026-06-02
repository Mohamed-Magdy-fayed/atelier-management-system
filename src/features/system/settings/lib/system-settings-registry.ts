import type { SettingsLabel } from "@/drizzle/schemas/system/settings-table";

export const DEFAULT_BUSINESS_TIMEZONE = "Africa/Cairo";
export const DEFAULT_CONTACT_EMAIL = "info@gateling.com";
export const DEFAULT_WHATSAPP_NUMBER = "+201000000000";

export const SYSTEM_SETTING_CODE = {
  CONTACT_EMAIL: "00001",
  WHATSAPP_NUMBER: "00002",
  BUSINESS_TIMEZONE: "00003",
} as const;

export type SystemSettingCode =
  (typeof SYSTEM_SETTING_CODE)[keyof typeof SYSTEM_SETTING_CODE];

export const SYSTEM_SETTING_CODES: SystemSettingCode[] = [
  SYSTEM_SETTING_CODE.CONTACT_EMAIL,
  SYSTEM_SETTING_CODE.WHATSAPP_NUMBER,
  SYSTEM_SETTING_CODE.BUSINESS_TIMEZONE,
];

export type SystemSettingDefinition = {
  code: SystemSettingCode;
  label: SettingsLabel;
  nameKey: "settingName00001" | "settingName00002" | "settingName00003";
  descriptionKey: "settingDesc00001" | "settingDesc00002" | "settingDesc00003";
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
    code: SYSTEM_SETTING_CODE.CONTACT_EMAIL,
    label: "integration",
    nameKey: "settingName00001",
    descriptionKey: "settingDesc00001",
    descriptionEn: "Email address displayed on the public contact page.",
    editable: { value: true },
    seed: { isActive: true, value: DEFAULT_CONTACT_EMAIL },
  },
  {
    code: SYSTEM_SETTING_CODE.WHATSAPP_NUMBER,
    label: "integration",
    nameKey: "settingName00002",
    descriptionKey: "settingDesc00002",
    descriptionEn:
      "WhatsApp number for the floating contact button (E.164 format, e.g. +201001234567).",
    editable: { isActive: true, value: true },
    seed: { isActive: true, value: DEFAULT_WHATSAPP_NUMBER },
  },
  {
    code: SYSTEM_SETTING_CODE.BUSINESS_TIMEZONE,
    label: "integration",
    nameKey: "settingName00003",
    descriptionKey: "settingDesc00003",
    descriptionEn:
      "IANA timezone used for date display across the admin dashboard.",
    editable: { isActive: true, value: true },
    seed: { isActive: true, value: DEFAULT_BUSINESS_TIMEZONE },
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

export const LEGACY_SETTING_CODE_VALUES: string[] = [];
