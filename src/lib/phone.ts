/**
 * Generate a WhatsApp URL with an optional pre-filled message.
 * Used by public landing pages for the floating WhatsApp button.
 */
export function generateWhatsAppUrl(phone: string, message?: string): string {
  const digits = phone.replace(/\D/g, "");
  const base = `https://wa.me/${digits}`;
  if (message) return `${base}?text=${encodeURIComponent(message)}`;
  return base;
}

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
