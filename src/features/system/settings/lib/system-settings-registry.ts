import type { SettingsLabel } from "@/drizzle/schemas/system/settings-table";

import { DEFAULT_RESERVATION_USAGE_POLICY } from "./default-reservation-usage-policy";

export { DEFAULT_RESERVATION_USAGE_POLICY };

/** Default IANA timezone when setting `00002` is unset or inactive. */
export const DEFAULT_BUSINESS_TIMEZONE = "Africa/Cairo";

/**
 * How outbound WhatsApp messages are sent, stored in setting `00006`.
 *
 * `own` never falls back to `platform`: sending from the shared number when the
 * atelier asked for theirs is worse than not sending, so an incomplete `own`
 * configuration is reported as broken rather than quietly re-routed.
 */
export const WHATSAPP_SENDING_MODES = ["off", "platform", "own"] as const;
export type WhatsAppSendingMode = (typeof WHATSAPP_SENDING_MODES)[number];
export const DEFAULT_WHATSAPP_SENDING_MODE: WhatsAppSendingMode = "platform";

/** Fixed system setting codes (policy / integration parameters). */
export const SYSTEM_SETTING_CODE = {
  SHOW_CATALOG_PRICES: "00001",
  BUSINESS_TIMEZONE: "00002",
  RESERVATION_USAGE_POLICY: "00003",
  SHOW_AVAILABILITY_CALENDAR: "00004",
  WHATSAPP_NUMBER: "00005",
  WHATSAPP_SENDING_MODE: "00006",
  WHATSAPP_INSTANCE_ID: "00007",
  WHATSAPP_API_TOKEN: "00008",
} as const;

export type SystemSettingCode =
  (typeof SYSTEM_SETTING_CODE)[keyof typeof SYSTEM_SETTING_CODE];

export const SYSTEM_SETTING_CODES: SystemSettingCode[] = [
  SYSTEM_SETTING_CODE.SHOW_CATALOG_PRICES,
  SYSTEM_SETTING_CODE.BUSINESS_TIMEZONE,
  SYSTEM_SETTING_CODE.RESERVATION_USAGE_POLICY,
  SYSTEM_SETTING_CODE.SHOW_AVAILABILITY_CALENDAR,
  SYSTEM_SETTING_CODE.WHATSAPP_NUMBER,
  SYSTEM_SETTING_CODE.WHATSAPP_SENDING_MODE,
  SYSTEM_SETTING_CODE.WHATSAPP_INSTANCE_ID,
  SYSTEM_SETTING_CODE.WHATSAPP_API_TOKEN,
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
    | "settingName00005"
    | "settingName00006"
    | "settingName00007"
    | "settingName00008";
  /** i18n key under `systemPages` */
  descriptionKey:
    | "settingDesc00001"
    | "settingDesc00002"
    | "settingDesc00003"
    | "settingDesc00004"
    | "settingDesc00005"
    | "settingDesc00006"
    | "settingDesc00007"
    | "settingDesc00008";
  /** English fallback stored in DB on seed (not user-editable). */
  descriptionEn: string;
  /**
   * Holds a third-party credential: encrypted at rest, never sent to a client,
   * and excluded from the grid's search. See `server/secret-crypto.ts`.
   */
  isSecret?: boolean;
  /**
   * Closed set of allowed values. Drives both the form's select options and the
   * server-side check, so the two cannot drift apart.
   */
  valueEnum?: readonly string[];
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
  {
    code: SYSTEM_SETTING_CODE.WHATSAPP_SENDING_MODE,
    label: "integration",
    nameKey: "settingName00006",
    descriptionKey: "settingDesc00006",
    descriptionEn:
      "How customer WhatsApp messages are sent. off: nothing is sent at all. platform: sent from the shared Gateling Atelier number, with a Gateling Atelier line appended. own: sent from this atelier's own number using the instance id and API token below, with no added branding.",
    valueEnum: WHATSAPP_SENDING_MODES,
    editable: { value: true },
    seed: { isActive: null, value: DEFAULT_WHATSAPP_SENDING_MODE },
  },
  {
    code: SYSTEM_SETTING_CODE.WHATSAPP_INSTANCE_ID,
    label: "integration",
    nameKey: "settingName00007",
    descriptionKey: "settingDesc00007",
    descriptionEn:
      "Wapilot instance id for this atelier's own WhatsApp number. Only used when the sending mode is own.",
    editable: { value: true },
    seed: { isActive: null, value: null },
  },
  {
    code: SYSTEM_SETTING_CODE.WHATSAPP_API_TOKEN,
    label: "integration",
    nameKey: "settingName00008",
    descriptionKey: "settingDesc00008",
    descriptionEn:
      "Wapilot API token paired with the instance id above. Stored encrypted and never shown again after saving. Only used when the sending mode is own.",
    isSecret: true,
    editable: { value: true },
    seed: { isActive: null, value: null },
  },
];

/** Codes whose stored value is ciphertext — never searched, never sent out. */
export const SECRET_SETTING_CODES: SystemSettingCode[] = SYSTEM_SETTINGS.filter(
  (def) => def.isSecret,
).map((def) => def.code);

export function getSystemSettingDefinition(
  code: string,
): SystemSettingDefinition | undefined {
  return SYSTEM_SETTINGS.find((row) => row.code === code);
}

export function isSystemSettingCode(code: string): code is SystemSettingCode {
  return SYSTEM_SETTING_CODES.includes(code as SystemSettingCode);
}

export const LEGACY_SETTING_CODE_VALUES = Object.values(LEGACY_SETTING_CODES);
