import {
  DEFAULT_BUSINESS_TIMEZONE,
  SYSTEM_SETTING_CODE,
} from "@/features/system/settings/lib/system-settings-registry";

export { SYSTEM_SETTING_CODE };

export const PUBLIC_BUSINESS_TIMEZONE = DEFAULT_BUSINESS_TIMEZONE;

/** @deprecated Use {@link SYSTEM_SETTING_CODE.SHOW_CATALOG_PRICES} (`00001`). */
export const PUBLIC_HIDE_CATALOG_PRICES_CODE =
  SYSTEM_SETTING_CODE.SHOW_CATALOG_PRICES;

/** @deprecated Use {@link SYSTEM_SETTING_CODE.BUSINESS_TIMEZONE} (`00002`). */
export const PUBLIC_BUSINESS_TIMEZONE_SETTING_CODE =
  SYSTEM_SETTING_CODE.BUSINESS_TIMEZONE;

/** Scan window when suggesting the next open date on the public dress page. */
export const NEXT_AVAILABLE_SCAN_DAYS = 60;
