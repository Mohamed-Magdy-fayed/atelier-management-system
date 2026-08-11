import type {
  PaymentMethod,
  PaymentType,
} from "@/drizzle/schemas/system/payments-table";

import type { Rng } from "./rng";

export type PaymentDraft = {
  amount: number;
  type: PaymentType;
  method: PaymentMethod;
  note: string | null;
  createdAt: Date;
};

/**
 * The only thing in this profile allowed to produce either a payment row or a
 * `reservations.totalPaid`. See {@link buildPaymentSchedule}.
 */
export type PaymentSchedule = {
  payments: PaymentDraft[];
  totalPaid: number;
  depositPaid: number;
};

/** How the balance ends up, from the customer's point of view. */
export type SettlementShape = "settled" | "depositOnly" | "partial";

/**
 * Weighted so the dashboard's payment-method breakdown has four visibly
 * different totals. A uniform split renders as four identical bars and reads as
 * fake.
 */
const METHOD_WEIGHTS = [
  ["cash", 38],
  ["instapay", 27],
  ["visa", 20],
  ["mobileWallet", 15],
] as const satisfies readonly (readonly [PaymentMethod, number])[];

function roundToStep(value: number, step: number): number {
  return Math.round(value / step) * step;
}

export type PaymentScheduleInput = {
  /**
   * `totalPrice - discount` — what the customer actually owes, with any late
   * fee ALREADY folded into `totalPrice` by the caller. A penalty is a
   * non-insurance payment, so it counts as revenue; if it were not also in the
   * contract value the reservation would render as overpaid.
   */
  contractValue: number;
  /** Refundable insurance held against the dress. Never counts as revenue. */
  insuranceAmount: number;
  /** Late fee, already included in `contractValue`. Zero for most bookings. */
  penalty: number;
  settlement: SettlementShape;
  /** When the booking was taken — the deposit and insurance land here. */
  bookedAt: Date;
  /** When the balance was cleared. Ignored unless `settlement` is "settled". */
  settledAt: Date;
  rng: Rng;
};

/**
 * Builds a reservation's whole payment history AND the `totalPaid` that
 * summarises it, in one call.
 *
 * This exists because the dashboard reads the same business two ways and they
 * have to agree on screen:
 *
 * - revenue  = `SUM(payments.amount)` where `type <> 'insurance'`
 * - outstanding = `(totalPrice - discount) - totalPaid`
 * - top-dress revenue = `SUM(reservations.totalPaid)`
 *
 * So `totalPaid` is not a number the caller chooses — it is *returned* here as
 * the sum of the non-insurance rows this function just emitted. Generating the
 * two independently is what makes a demo indefensible in front of a prospect:
 * the revenue card and the outstanding card contradict each other and there is
 * no story that reconciles them.
 *
 * Callers must take `payments`, `totalPaid` and `depositPaid` from the same
 * return value and never compute any of them separately.
 */
export function buildPaymentSchedule(
  input: PaymentScheduleInput,
): PaymentSchedule {
  const {
    contractValue,
    insuranceAmount,
    penalty,
    settlement,
    bookedAt,
    settledAt,
    rng,
  } = input;

  const payments: PaymentDraft[] = [];
  const method = () => rng.weighted(METHOD_WEIGHTS);

  // A deposit is always taken at booking, and never exceeds what is owed.
  const deposit = Math.max(
    0,
    Math.min(
      contractValue - penalty,
      roundToStep(contractValue * (0.3 + rng.next() * 0.2), 50),
    ),
  );

  if (deposit > 0) {
    payments.push({
      amount: deposit,
      type: "deposit",
      method: method(),
      note: null,
      createdAt: bookedAt,
    });
  }

  if (insuranceAmount > 0) {
    payments.push({
      amount: insuranceAmount,
      type: "insurance",
      method: method(),
      note: "Refundable insurance held against the dress.",
      createdAt: bookedAt,
    });
  }

  if (settlement === "settled") {
    const balance = contractValue - deposit - penalty;
    if (balance > 0) {
      payments.push({
        amount: balance,
        type: "finalPayment",
        method: method(),
        note: null,
        createdAt: settledAt,
      });
    }
    if (penalty > 0) {
      payments.push({
        amount: penalty,
        type: "penalty",
        method: method(),
        note: "Late return fee.",
        createdAt: settledAt,
      });
    }
  } else if (settlement === "partial") {
    // A part payment against the balance, leaving a real receivable behind.
    const remaining = contractValue - deposit;
    const part = Math.max(
      0,
      Math.min(remaining - 50, roundToStep(remaining * 0.35, 50)),
    );
    if (part > 0) {
      payments.push({
        amount: part,
        type: "finalPayment",
        method: method(),
        note: "Part payment against the balance.",
        createdAt: settledAt,
      });
    }
  }

  // Derived, never assigned: this is the invariant the whole profile rests on.
  const totalPaid = payments
    .filter((payment) => payment.type !== "insurance")
    .reduce((sum, payment) => sum + payment.amount, 0);

  const depositPaid = payments
    .filter((payment) => payment.type === "deposit")
    .reduce((sum, payment) => sum + payment.amount, 0);

  return { payments, totalPaid, depositPaid };
}
