/**
 * The branding a deployment serves, with `null` meaning "unset".
 *
 * Unset falls back to what the build ships with rather than rendering blank, so
 * a database with no branding rows looks exactly as it did before branding was
 * configurable. Every client runs its own deployment against its own database,
 * so these three values are what separate one install from another.
 */
export type Branding = {
  nameEn: string | null;
  nameAr: string | null;
  logoUrl: string | null;
};

export const EMPTY_BRANDING: Branding = {
  nameEn: null,
  nameAr: null,
  logoUrl: null,
};

/** Logo bundled with the build, used when no logo URL is configured. */
export const BUNDLED_LOGO_SRC = "/logo.png";

/**
 * Picks the configured name for a locale, falling back to the build's own.
 *
 * Arabic falls back to the English branding before the bundled name: a client
 * who set only one name wants that name shown, not a mix of their brand and
 * ours.
 */
export function resolveBrandName(
  branding: Branding,
  locale: string,
  bundledName: string,
): string {
  const configured =
    locale === "ar"
      ? (branding.nameAr ?? branding.nameEn)
      : (branding.nameEn ?? branding.nameAr);

  return configured ?? bundledName;
}

/** Configured logo URL, or the one bundled with the build. */
export function resolveLogoSrc(branding: Branding): string {
  return branding.logoUrl ?? BUNDLED_LOGO_SRC;
}

/**
 * The host Firebase Storage serves uploads from.
 *
 * A logo is uploaded through the same path as dress images, so it always lands
 * here. `next/image` only optimises hosts listed in `images.remotePatterns`,
 * so a URL from anywhere else renders broken — which is why the write path
 * rejects one rather than storing it.
 */
export const FIREBASE_STORAGE_HOST = "storage.googleapis.com";

export function isSupportedLogoUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && parsed.hostname === FIREBASE_STORAGE_HOST;
  } catch {
    return false;
  }
}
