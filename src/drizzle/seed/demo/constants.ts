/**
 * Tuning constants for the `demo` seed profile.
 *
 * Everything the profile generates is a pure function of `DEMO_SEED` and the
 * single `now` captured at the start of the run, so the same command against
 * the same day produces the same database — see `build.ts`.
 *
 * The magnitudes here are calibrated against the atelier's own imported
 * history, so the demo reads as a real year of trading rather than a fixture:
 * roughly ten reservations per dress per year, contracts clustered near
 * 900 EGP, and customers who overwhelmingly book exactly once.
 */

/** Sole entropy source for the profile. Changing it reshuffles the dataset. */
export const DEMO_SEED = 20_260_811;

/**
 * Phone numbers are filmed and published, so they must be impossible to dial.
 * Every demo number is `010` + a zero-filled block: inside the Egyptian mobile
 * *format*, outside any assigned range.
 *
 * `core.ts`'s `pickPhone()` deliberately produces realistic mobiles and must
 * never be used from this profile.
 */
export const DEMO_PHONE = {
  /**
   * Shared 11-digit shape: `010000` + a five-digit block. The blocks are kept
   * disjoint so no two records ever show the same number — customers count up
   * from 1, staff and branches sit high enough that a large customer base can
   * never reach them.
   */
  prefix: "2010000",
  /** `01000000001` upward — one per rental customer. */
  customerBlock: 0,
  /** `01000090001` upward — one per employee. */
  employeeBlock: 90_000,
  /** `01000099001` upward — one per branch landline. */
  branchBlock: 99_000,
} as const;

/** The window the generated history covers. */
export const HISTORY_DAYS = 365;

/**
 * Customers book once and are never seen again — this is bridal, not
 * groceries. Taken from the imported history, where 984 customers had exactly
 * one reservation, 65 had two, 12 had three and 2 had four.
 *
 * Weights are relative; the generator repeats a customer as many times as the
 * bucket it lands in.
 */
export const CUSTOMER_REPEAT_WEIGHTS = [
  [1, 930],
  [2, 60],
  [3, 8],
  [4, 2],
] as const satisfies readonly (readonly [number, number])[];

/**
 * Cash dominates, as it does in the real ledger (roughly 90% of rows). The
 * long tail is widened a little so the dashboard's method breakdown shows four
 * populated segments instead of one bar and three slivers — `visa` in
 * particular has no rows at all in the imported data.
 */
export const PAYMENT_METHOD_WEIGHTS = [
  ["cash", 62],
  ["instapay", 20],
  ["visa", 10],
  ["mobileWallet", 8],
] as const;

/**
 * How often a booking carries each optional money row. The imported history has
 * neither, because the legacy export never carried them — but both are live
 * product features the walkthrough has to demonstrate, so the demo seeds them
 * deliberately.
 */
export const INSURANCE_RATE = 0.25;
export const PENALTY_RATE = 0.012;

/** Share of bookings whose balance was cleared, from the imported history. */
export const SETTLED_RATE = 0.78;

export const DEMO_ACTOR = "system:seed";
