"use client";

import { createContext, useContext, useMemo } from "react";

import { useTranslation } from "@/features/core/i18n/client";
import {
  type Branding,
  EMPTY_BRANDING,
  resolveBrandName,
  resolveLogoSrc,
} from "@/features/system/settings/lib/branding";

/**
 * Defaults to empty rather than throwing on a missing provider.
 *
 * Branding is cosmetic: a client component rendered outside the provider (a
 * printed receipt opened in its own window, say) should fall back to the
 * bundled name, not crash the page.
 */
const BrandingContext = createContext<Branding>(EMPTY_BRANDING);

export function BrandingProvider({
  value,
  children,
}: {
  value: Branding;
  children: React.ReactNode;
}) {
  return (
    <BrandingContext.Provider value={value}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding(): Branding {
  return useContext(BrandingContext);
}

/**
 * The business name for the active locale, falling back to the bundled
 * `appName` translation when this deployment has no branding configured.
 */
export function useBrandName(): string {
  const branding = useBranding();
  const { t, locale } = useTranslation();

  return useMemo(
    () => resolveBrandName(branding, locale, String(t("appName"))),
    [branding, locale, t],
  );
}

/** The configured logo URL, or the one bundled with the build. */
export function useBrandLogoSrc(): string {
  return resolveLogoSrc(useBranding());
}
