import type { WhatsAppSendingMode } from "@/features/system/settings/lib/system-settings-registry";

export type ReservationMessageData = {
  customerName: string;
  branchName: string;
  reservationCode: string;
  dressTitle: string;
  dressCode: string | null;
  receivingDateTime: Date;
  occasionDate: Date | null;
  returnDateTime: Date;
  totalPrice: number;
  discount: number;
  insurance: number;
  depositPaid: number;
};

/**
 * Only the keys this message uses.
 *
 * Narrower than the app's full translator on purpose: the real `t` is
 * assignable to this, so callers pass it unchanged, while a typo in a key here
 * still fails to compile. Composing keys as `systemPages.${name}` would have
 * thrown that away.
 */
type ReservationMessageKey =
  | "systemPages.whatsappReservationGreeting"
  | "systemPages.whatsappReservationIntro"
  | "systemPages.whatsappReservationDress"
  | "systemPages.whatsappReservationReceiving"
  | "systemPages.whatsappReservationOccasion"
  | "systemPages.whatsappReservationReturn"
  | "systemPages.whatsappReservationTotal"
  | "systemPages.whatsappReservationDeposit"
  | "systemPages.whatsappReservationOutstanding"
  | "systemPages.whatsappReservationInsurance"
  | "systemPages.whatsappBrandingSuffix";

type Translate = (
  key: ReservationMessageKey,
  params: Record<string, string>,
) => string;

/**
 * Formats a date for a customer rather than for a log: no seconds, no ISO, and
 * in the business timezone so "pick up at 18:00" means the shop's 18:00.
 */
function formatDateTime(value: Date, locale: string, timeZone: string): string {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(value);
}

function formatDate(value: Date, locale: string, timeZone: string): string {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", {
    dateStyle: "medium",
    timeZone,
  }).format(value);
}

function formatMoney(amount: number, locale: string): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-GB", {
    style: "currency",
    currency: "EGP",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Builds the confirmation a customer receives after a reservation is created.
 *
 * Plain text, one fact per line: this is read on a phone, often forwarded to a
 * relative, and WhatsApp has no formatting worth relying on.
 *
 * The branding line is appended only for `platform`. On `own` the atelier is
 * sending from their own number, and stamping our name on their message would
 * be putting our brand in a conversation the customer thinks is with them.
 */
export function buildReservationMessage({
  t,
  locale,
  timeZone,
  mode,
  data,
}: {
  t: Translate;
  locale: string;
  timeZone: string;
  mode: WhatsAppSendingMode;
  data: ReservationMessageData;
}): string {
  const dressLabel = data.dressCode
    ? `${data.dressTitle} (${data.dressCode})`
    : data.dressTitle;

  const totalDue = Math.max(data.totalPrice - data.discount, 0);
  const outstanding = Math.max(totalDue - data.depositPaid, 0);

  const lines = [
    t("systemPages.whatsappReservationGreeting", { name: data.customerName }),
    "",
    t("systemPages.whatsappReservationIntro", {
      branch: data.branchName,
      code: data.reservationCode,
    }),
    "",
    t("systemPages.whatsappReservationDress", { dress: dressLabel }),
    t("systemPages.whatsappReservationReceiving", {
      date: formatDateTime(data.receivingDateTime, locale, timeZone),
    }),
  ];

  if (data.occasionDate) {
    lines.push(
      t("systemPages.whatsappReservationOccasion", {
        date: formatDate(data.occasionDate, locale, timeZone),
      }),
    );
  }

  lines.push(
    t("systemPages.whatsappReservationReturn", {
      date: formatDateTime(data.returnDateTime, locale, timeZone),
    }),
    "",
    t("systemPages.whatsappReservationTotal", {
      amount: formatMoney(totalDue, locale),
    }),
    t("systemPages.whatsappReservationDeposit", {
      amount: formatMoney(data.depositPaid, locale),
    }),
  );

  if (outstanding > 0) {
    lines.push(
      t("systemPages.whatsappReservationOutstanding", {
        amount: formatMoney(outstanding, locale),
      }),
    );
  }

  if (data.insurance > 0) {
    lines.push(
      t("systemPages.whatsappReservationInsurance", {
        amount: formatMoney(data.insurance, locale),
      }),
    );
  }

  if (mode === "platform") {
    lines.push(
      "",
      t("systemPages.whatsappBrandingSuffix", {}),
    );
  }

  return lines.join("\n");
}
