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
  /** `#RRGGBB`; replaces the bundled primary colour when set. */
  primaryColor: string | null;
};

export const EMPTY_BRANDING: Branding = {
  nameEn: null,
  nameAr: null,
  logoUrl: null,
  primaryColor: null,
};

/** Logo bundled with the build, used when no logo URL is configured. */
export const BUNDLED_LOGO_SRC = "/logo.svg";

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

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

/**
 * Only `#RRGGBB` is accepted. The value is spliced into a `<style>` element, so
 * the strict pattern is what keeps a stored setting from injecting CSS.
 */
export function isHexColor(value: string): boolean {
  return HEX_COLOR.test(value);
}

/** Text colours from `globals.css`, reused so a brand colour sits in the palette. */
const LIGHT_TEXT = "oklch(0.9850 0.0060 60.0000)";
const DARK_TEXT = "oklch(0.1700 0.0120 50.0000)";

/** WCAG relative luminance of an `#RRGGBB` colour, 0 (black) to 1 (white). */
function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5].map((start) => {
    const value = Number.parseInt(hex.slice(start, start + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

/**
 * Light text on a brand colour unless the colour is light enough that dark text
 * contrasts better. 0.179 is where the two contrast ratios are equal.
 */
function foregroundFor(hex: string): string {
  return relativeLuminance(hex) > 0.179 ? DARK_TEXT : LIGHT_TEXT;
}

/**
 * CSS that re-points the primary tokens at a brand colour, or `null` when the
 * value is unset or invalid.
 *
 * Dark mode gets the colour lifted towards white, the same move the bundled
 * palette makes (wine 0.42 → 0.70 lightness), so it stays readable on a dark
 * surface; text on it is then always dark.
 */
export function buildBrandColorCss(primaryColor: string | null): string | null {
  if (!primaryColor || !isHexColor(primaryColor)) return null;

  const light = primaryColor.toLowerCase();
  const dark = `color-mix(in oklch, ${light} 55%, white)`;
  const lightText = foregroundFor(light);

  const tokens = (color: string, text: string) =>
    [
      `--primary:${color}`,
      `--primary-foreground:${text}`,
      `--ring:${color}`,
      `--sidebar-primary:${color}`,
      `--sidebar-primary-foreground:${text}`,
      `--sidebar-ring:${color}`,
    ].join(";");

  return `:root{${tokens(light, lightText)}}.dark{${tokens(dark, DARK_TEXT)}}`;
}
