import type { TranslationKey } from "@/features/core/i18n/lib";
import type { mainTranslations } from "@/features/core/i18n/global";

import { SYSTEM_SETTING_CODE } from "./system-settings-registry";

type TranslateKey = TranslationKey<typeof mainTranslations>;

/**
 * Labels for settings whose value is a closed enum.
 *
 * Kept beside the registry rather than inline in the form so the grid's value
 * column and the edit dialog show the same words — a mode reading "platform" in
 * one place and "Gateling Atelier number" in the other is how an operator ends
 * up unsure which is in effect.
 */
const VALUE_OPTION_LABEL_KEYS: Record<string, Record<string, TranslateKey>> = {
  [SYSTEM_SETTING_CODE.WHATSAPP_SENDING_MODE]: {
    off: "systemPages.settingsWhatsAppModeOff",
    platform: "systemPages.settingsWhatsAppModePlatform",
    own: "systemPages.settingsWhatsAppModeOwn",
  },
};

/** Translated label for one enum value, falling back to the raw value. */
export function getSettingValueOptionLabel(
  code: string,
  value: string,
  t: (key: TranslateKey) => unknown,
): string {
  const key = VALUE_OPTION_LABEL_KEYS[code]?.[value];
  return key ? String(t(key)) : value;
}
