import type { useTranslation } from "@/features/core/i18n/client";

import {
  getSystemSettingDefinition,
  type SystemSettingDefinition,
} from "./system-settings-registry";

type Translate = ReturnType<typeof useTranslation>["t"];

export function getSettingDisplayName(code: string, t: Translate): string {
  const def = getSystemSettingDefinition(code);
  if (!def) return code;
  return String(t(`systemPages.${def.nameKey}`));
}

export function getSettingDisplayDescription(
  code: string,
  t: Translate,
): string {
  const def = getSystemSettingDefinition(code);
  if (!def) return "";
  return String(t(`systemPages.${def.descriptionKey}`));
}

export function getSettingDefinitionOrThrow(
  code: string,
): SystemSettingDefinition {
  const def = getSystemSettingDefinition(code);
  if (!def) {
    throw new Error(`Unknown system setting code: ${code}`);
  }
  return def;
}
