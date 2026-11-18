import { CURRENCY, intlLocale } from "@/lib/locale-config";

export function formatCurrency(amount: number, locale = intlLocale("en")) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: CURRENCY,
  }).format(amount);
}

export function formatDate(
  date: Date | string | number | undefined,
  opts: Intl.DateTimeFormatOptions = {},
  locale = intlLocale("en"),
) {
  if (!date) return "";

  try {
    return new Intl.DateTimeFormat(locale, {
      month: opts.month ?? "long",
      day: opts.day ?? "numeric",
      year: opts.year ?? "numeric",
      ...opts,
    }).format(new Date(date));
  } catch {
    return "";
  }
}
