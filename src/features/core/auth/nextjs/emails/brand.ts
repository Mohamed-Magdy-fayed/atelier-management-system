import "server-only";

import { getLocaleCookie, getT } from "@/features/core/i18n/server";
import { resolveBrandName } from "@/features/system/settings/lib/branding";
import { getBranding } from "@/features/system/settings/server/branding";

/**
 * The business name an auth email is sent in the name of.
 *
 * Each install is a different atelier, so a customer resetting their password
 * must see that atelier's name, not the vendor's. Falls back to the bundled app
 * name when no branding is configured.
 */
export async function getEmailBrandName(): Promise<string> {
  const { t } = await getT();
  return resolveBrandName(
    await getBranding(),
    await getLocaleCookie(),
    String(t("appName")),
  );
}
