/** `https://wa.me/…` link for a stored phone (E.164 digits, optional leading +). */
export function toWhatsAppUrl(phone: string | null | undefined): string | null {
  if (!phone?.trim()) return null;
  let digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("0")) {
    digits = `20${digits.slice(1)}`;
  } else if (digits.length === 10) {
    digits = `20${digits}`;
  }
  return `https://wa.me/${digits}`;
}

/** Digits-only key for matching walk-in rental phones to login accounts. */
export function normalizePhoneKey(phone: string | null | undefined): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length >= 10 && digits.startsWith("20")) {
    return digits.slice(2);
  }
  return digits;
}

/**
 * Identity key for a rental customer: one person is one row regardless of how
 * the phone was typed. Drops formatting, the `20` country code, and leading
 * zeros, so `0100 123 4567`, `+201001234567` and `1001234567` collapse to one
 * key. Kept in sync with the `rental_customer_phone_key(text)` SQL function
 * created in migration 0011.
 */
export function rentalCustomerPhoneKey(
  phone: string | null | undefined,
): string {
  return normalizePhoneKey(phone).replace(/^0+/, "");
}
