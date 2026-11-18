/**
 * Per-install regional defaults: currency, number/date locale, phone country,
 * payment methods and the minimum deposit.
 *
 * Each client runs its own deployment, so these come from env rather than the
 * database: `NEXT_PUBLIC_CURRENCY` (ISO 4217) and `NEXT_PUBLIC_REGION` (ISO
 * 3166-1 alpha-2). The defaults are USD / US. An Egyptian install sets
 * `NEXT_PUBLIC_CURRENCY=EGP` and `NEXT_PUBLIC_REGION=EG` and behaves exactly as
 * it did before this module existed.
 *
 * Money is stored in whole currency units, so 3-decimal currencies (KWD, BHD)
 * are not supported.
 */

const SUPPORTED_REGIONS = ["US", "GB", "CA", "AU", "AE", "SA", "EG"] as const;
export type Region = (typeof SUPPORTED_REGIONS)[number];

function readRegion(): Region {
  const raw = (process.env.NEXT_PUBLIC_REGION ?? "US").toUpperCase();
  return (SUPPORTED_REGIONS as readonly string[]).includes(raw)
    ? (raw as Region)
    : "US";
}

export const REGION: Region = readRegion();

/** ISO 4217 code every amount in this install is shown in. */
export const CURRENCY: string = (
  process.env.NEXT_PUBLIC_CURRENCY ?? "USD"
).toUpperCase();

/** Default country of the phone input. */
export const DEFAULT_PHONE_COUNTRY: Region = REGION;

/** E.164 calling code (digits only) for national numbers typed without one. */
export const DEFAULT_CALLING_CODE: string = {
  US: "1",
  CA: "1",
  GB: "44",
  AU: "61",
  AE: "971",
  SA: "966",
  EG: "20",
}[REGION];

/**
 * Smallest deposit a reservation may take. 100 only makes sense in EGP; in a
 * strong currency it would exceed the rental price of most dresses.
 */
export const MIN_DEPOSIT: number = CURRENCY === "EGP" ? 100 : 20;

/**
 * Intl locale for the UI language.
 *
 * Arabic outside Egypt uses `ar-AE`, which formats with Western digits: Arabic
 * speakers in the diaspora read prices and phone numbers in Latin digits.
 */
export function intlLocale(locale: string): string {
  if (locale === "ar") return REGION === "EG" ? "ar-EG" : "ar-AE";
  return `en-${REGION === "EG" ? "EG" : REGION}`;
}

export type PaymentMethodId =
  | "cash"
  | "instapay"
  | "mobileWallet"
  | "visa"
  | "card"
  | "bankTransfer"
  | "paypal";

/** Payment methods offered when recording a payment, in display order. */
export const ENABLED_PAYMENT_METHODS: readonly PaymentMethodId[] =
  REGION === "EG"
    ? ["cash", "instapay", "mobileWallet", "visa"]
    : ["cash", "card", "bankTransfer", "paypal"];
