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
 * Remote logos skip Next's optimizer.
 *
 * The alternative is an `images.remotePatterns` entry, and the only pattern
 * broad enough to accept whatever host a client uploads to is a wildcard —
 * which turns the deployment into an open image proxy. A logo is small enough
 * that the optimizer earns little here.
 */
export function isRemoteLogo(src: string): boolean {
  return src.startsWith("http://") || src.startsWith("https://");
}
