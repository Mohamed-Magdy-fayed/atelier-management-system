import type {
  BranchesTable,
  BranchMembershipsTable,
  DressesTable,
  ExpensesTable,
  PaymentsTable,
  RentalCustomersTable,
  ReservationsTable,
  UsersTable,
} from "@/drizzle/schema";
import type { ExpenseType } from "@/drizzle/schemas/system/expenses-table";
import type { ReservationStatus } from "@/drizzle/schemas/system/reservations-table";
import { toLocalDateString } from "@/features/system/dashboard/lib/dates";

import { SEED_ADMIN_ID } from "../constants";
import {
  CUSTOMER_REPEAT_WEIGHTS,
  DEMO_ACTOR,
  DEMO_SEED,
  HISTORY_DAYS,
  INSURANCE_RATE,
  PENALTY_RATE,
} from "./constants";
import {
  buildDemoCustomers,
  DEMO_BRANCHES,
  DEMO_DRESSES,
  DEMO_EMPLOYEES,
  DEMO_EXPENSE_DESCRIPTIONS,
  DEMO_RESERVATION_NOTES,
  type DemoCustomer,
  type DemoDress,
} from "./fixtures";
import { demoId } from "./ids";
import { buildPaymentSchedule, type SettlementShape } from "./payments";
import { createRng, type Rng } from "./rng";

const HOUR_MS = 60 * 60 * 1_000;
const DAY_MS = 24 * HOUR_MS;

/** Held-out customers per branch, reserved for the curated bookings. */
const HELD_CUSTOMERS_PER_BRANCH = 10;
const HELD_CUSTOMERS = HELD_CUSTOMERS_PER_BRANCH * DEMO_BRANCHES.length;

export type DemoDataset = {
  branches: Array<typeof BranchesTable.$inferInsert>;
  employees: Array<typeof UsersTable.$inferInsert>;
  memberships: Array<typeof BranchMembershipsTable.$inferInsert>;
  dresses: Array<typeof DressesTable.$inferInsert>;
  customers: Array<typeof RentalCustomersTable.$inferInsert>;
  reservations: Array<typeof ReservationsTable.$inferInsert>;
  payments: Array<typeof PaymentsTable.$inferInsert>;
  expenses: Array<typeof ExpensesTable.$inferInsert>;
};

/**
 * A reservation and the payments that justify its `totalPaid`, kept together
 * until they are flattened into the dataset. Nothing may set `totalPaid` other
 * than {@link buildPaymentSchedule}.
 */
type ReservationBundle = {
  reservation: typeof ReservationsTable.$inferInsert;
  payments: Array<typeof PaymentsTable.$inferInsert>;
};

function startOfLocalDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** `dayOffset` may be negative; `hour` is a local wall-clock hour. */
function at(dayStart: Date, dayOffset: number, hour: number): Date {
  return new Date(dayStart.getTime() + dayOffset * DAY_MS + hour * HOUR_MS);
}

function roundToStep(value: number, step: number): number {
  return Math.round(value / step) * step;
}

/**
 * `RES-<BRANCH>-<YYYYMMDD>-<NNN>`, matching `generateReservationCode`
 * (src/features/system/reservations/utils.ts). `reservations.reservationCode`
 * is globally unique, and the branch + booking day + per-day counter make that
 * true by construction rather than by retry.
 */
function makeCodeFactory() {
  const counters = new Map<string, number>();
  return (shortCode: string, createdAt: Date): string => {
    const year = createdAt.getFullYear();
    const month = String(createdAt.getMonth() + 1).padStart(2, "0");
    const day = String(createdAt.getDate()).padStart(2, "0");
    const key = `${shortCode}-${year}${month}${day}`;
    const next = (counters.get(key) ?? 0) + 1;
    counters.set(key, next);
    return `RES-${key}-${String(next).padStart(3, "0")}`;
  };
}

/**
 * A geometric popularity curve over a branch's portfolio: `max` rentals on its
 * best dress, decaying to nothing on its two newest pieces, summing to the
 * branch's annual booking volume.
 *
 * A flat distribution is the giveaway that data is fabricated. Real inventory is
 * brutally skewed — the atelier's imported history has a dress rented 56 times
 * sitting alongside a portfolio median of 6 — and the "most rented" panel says
 * nothing without that spread.
 *
 * The ratio is found by bisection because there is no closed form for it, and
 * the rounding residual is pushed onto the busiest dresses, which absorb it
 * invisibly.
 */
export function buildRentalTargets(
  count: number,
  max: number,
  total: number,
): number[] {
  const idleTail = Math.min(2, count - 1);
  const active = count - idleTail;

  const sumFor = (ratio: number) => {
    let sum = 0;
    for (let i = 0; i < active; i += 1) sum += max * ratio ** i;
    return sum;
  };

  let low = 0.5;
  let high = 0.999;
  for (let step = 0; step < 80; step += 1) {
    const mid = (low + high) / 2;
    if (sumFor(mid) < total) low = mid;
    else high = mid;
  }
  const ratio = (low + high) / 2;

  const targets = Array.from({ length: count }, (_, i) =>
    i < active ? Math.max(1, Math.round(max * ratio ** i)) : 0,
  );

  // Bounded: `i` wraps, so the loop's only natural exit is drift reaching zero,
  // and a residual that cannot be absorbed (every active target already at its
  // floor of 1) would otherwise spin forever.
  let drift = total - targets.reduce((sum, value) => sum + value, 0);
  const maxPasses = active * 4;
  for (let pass = 0; drift !== 0 && pass < maxPasses; pass += 1) {
    const i = pass % active;
    const step = drift > 0 ? 1 : -1;
    if (targets[i] + step >= 1) {
      targets[i] += step;
      drift -= step;
    }
  }

  return targets;
}

/**
 * Tracks which days each dress is already committed to.
 *
 * A dress cannot be out on two rentals at once, and an atelier owner watching
 * the demo spots a double-booking in the grid immediately. Collisions are
 * resolved by walking the booking backwards in time until it fits, which stays
 * deterministic — re-rolling the date would not.
 */
class DressCalendar {
  private readonly ranges = new Map<string, Array<[number, number]>>();

  /** A day of turnaround between rentals, for cleaning and inspection. */
  private static readonly BUFFER_DAYS = 1;

  place(
    dressId: string,
    desiredStart: number,
    lengthDays: number,
    forbidCoveringToday: boolean,
  ): { start: number; end: number } | null {
    const existing = this.ranges.get(dressId) ?? [];

    for (let attempt = 0; attempt < 400; attempt += 1) {
      const start = desiredStart - attempt;
      const end = start + lengthDays;

      // A dress parked at the tailor must not also be out on a rental:
      // `dressIsOutNow()` ignores `currentStatus`, so an overlapping booking
      // would silently empty the maintenance buckets on the dashboard.
      if (forbidCoveringToday && start <= 0 && end >= 0) continue;

      const clashes = existing.some(
        ([otherStart, otherEnd]) =>
          start - DressCalendar.BUFFER_DAYS <= otherEnd &&
          otherStart - DressCalendar.BUFFER_DAYS <= end,
      );
      if (clashes) continue;

      existing.push([start, end]);
      this.ranges.set(dressId, existing);
      return { start, end };
    }

    return null;
  }
}

type ReservationSpec = {
  key: string;
  branchIndex: number;
  customerIndex: number;
  status: ReservationStatus;
  createdDaysAgo: number;
  receivingDaysOffset: number;
  receivingHour: number;
  occasionDaysOffset: number;
  returnDaysOffset: number;
  returnHour: number;
  settlement: SettlementShape;
  settledAfterDays: number;
  discountRatio: number;
  penalty: number;
  insurance: boolean;
  noteIndex: number;
};

type CuratedSpec = Omit<ReservationSpec, "branchIndex" | "customerIndex"> & {
  /** Position on the branch's popularity curve. */
  dressRank: number;
  /** Index into this branch's held-out customer block, 0-9. */
  customerSlot: number;
};

/**
 * The seventeen bookings placed by hand on every branch.
 *
 * The generated year supplies the volume; these supply the *states* the
 * walkthrough script depends on, which are far too specific to leave to a
 * distribution: a return due today, overdue returns, outstanding balances on
 * both arms of `balanceDueDateSql`, a cancellation, and a populated previous
 * comparison window.
 *
 * Offsets are relative to today's local midnight, so the set rolls forward with
 * the calendar and nothing goes stale between recording sessions.
 */
const CURATED_SPECS: readonly CuratedSpec[] = [
  {
    // Upcoming pickup, deposit only → outstanding with due date = pickup.
    key: "upcoming-outstanding",
    dressRank: 0,
    customerSlot: 0,
    status: "reserved",
    createdDaysAgo: 5,
    receivingDaysOffset: 1,
    receivingHour: 11,
    occasionDaysOffset: 2,
    returnDaysOffset: 3,
    returnHour: 19,
    settlement: "depositOnly",
    settledAfterDays: 0,
    discountRatio: 0,
    penalty: 0,
    insurance: true,
    noteIndex: 5,
  },
  {
    key: "upcoming-settled",
    dressRank: 1,
    customerSlot: 1,
    status: "reserved",
    createdDaysAgo: 9,
    receivingDaysOffset: 3,
    receivingHour: 12,
    occasionDaysOffset: 4,
    returnDaysOffset: 6,
    returnHour: 19,
    settlement: "settled",
    settledAfterDays: 2,
    discountRatio: 0.05,
    penalty: 0,
    insurance: true,
    noteIndex: 7,
  },
  {
    // Upcoming pickup for a customer acquired inside the current window.
    key: "upcoming-new-customer",
    dressRank: 2,
    customerSlot: 8,
    status: "reserved",
    createdDaysAgo: 12,
    receivingDaysOffset: 6,
    receivingHour: 10,
    occasionDaysOffset: 6,
    returnDaysOffset: 8,
    returnHour: 19,
    settlement: "partial",
    settledAfterDays: 4,
    discountRatio: 0,
    penalty: 0,
    insurance: false,
    noteIndex: 4,
  },
  {
    // Out on rental right now → fills the `dressesOut` bucket.
    key: "out-now",
    dressRank: 1,
    customerSlot: 2,
    status: "pickedUp",
    createdDaysAgo: 6,
    receivingDaysOffset: -1,
    receivingHour: 10,
    occasionDaysOffset: 0,
    returnDaysOffset: 2,
    returnHour: 19,
    settlement: "settled",
    settledAfterDays: 5,
    discountRatio: 0,
    penalty: 0,
    insurance: true,
    noteIndex: 8,
  },
  {
    key: "due-today",
    dressRank: 2,
    customerSlot: 3,
    status: "pickedUp",
    createdDaysAgo: 7,
    receivingDaysOffset: -2,
    receivingHour: 10,
    occasionDaysOffset: -1,
    returnDaysOffset: 0,
    // Late in the evening on purpose: an earlier return time would flip this
    // from "due today, still out" to "overdue" partway through the afternoon,
    // and the `dressesOut` tile would drop mid-recording.
    returnHour: 23,
    settlement: "settled",
    settledAfterDays: 5,
    discountRatio: 0,
    penalty: 0,
    insurance: false,
    noteIndex: 0,
  },
  {
    key: "overdue-paid",
    dressRank: 0,
    customerSlot: 4,
    status: "pickedUp",
    createdDaysAgo: 11,
    receivingDaysOffset: -6,
    receivingHour: 10,
    occasionDaysOffset: -5,
    returnDaysOffset: -2,
    returnHour: 19,
    settlement: "settled",
    settledAfterDays: 5,
    discountRatio: 0,
    penalty: 0,
    insurance: false,
    noteIndex: 1,
  },
  {
    // Overdue AND still owing → the due date comes off `returnDateTime`, the
    // ELSE arm of balanceDueDateSql.
    key: "overdue-outstanding",
    dressRank: 1,
    customerSlot: 0,
    status: "pickedUp",
    createdDaysAgo: 14,
    receivingDaysOffset: -9,
    receivingHour: 11,
    occasionDaysOffset: -8,
    returnDaysOffset: -4,
    returnHour: 19,
    settlement: "partial",
    settledAfterDays: 3,
    discountRatio: 0,
    penalty: 0,
    insurance: true,
    noteIndex: 5,
  },
  {
    key: "returned-outstanding",
    dressRank: 2,
    customerSlot: 9,
    status: "returned",
    createdDaysAgo: 18,
    receivingDaysOffset: -14,
    receivingHour: 12,
    occasionDaysOffset: -13,
    returnDaysOffset: -11,
    returnHour: 19,
    settlement: "partial",
    settledAfterDays: 4,
    discountRatio: 0.08,
    penalty: 0,
    insurance: false,
    noteIndex: 10,
  },
  {
    // Returned late and settled, including the late fee → the penalty payment.
    key: "returned-late-fee",
    dressRank: 3,
    customerSlot: 5,
    status: "returned",
    createdDaysAgo: 22,
    receivingDaysOffset: -20,
    receivingHour: 11,
    occasionDaysOffset: -19,
    returnDaysOffset: -18,
    returnHour: 19,
    settlement: "settled",
    settledAfterDays: 4,
    discountRatio: 0,
    penalty: 300,
    insurance: true,
    noteIndex: 0,
  },
  {
    key: "returned-settled",
    dressRank: 4,
    customerSlot: 6,
    status: "returned",
    createdDaysAgo: 28,
    receivingDaysOffset: -26,
    receivingHour: 12,
    occasionDaysOffset: -25,
    returnDaysOffset: -24,
    returnHour: 19,
    settlement: "settled",
    settledAfterDays: 2,
    discountRatio: 0,
    penalty: 0,
    insurance: false,
    noteIndex: 1,
  },
  {
    // Cancelled → a small, non-zero cancellation rate. Excluded from revenue,
    // outstanding, timesRented and the customer-acquisition definition.
    key: "cancelled",
    dressRank: 0,
    customerSlot: 1,
    status: "cancelled",
    createdDaysAgo: 8,
    receivingDaysOffset: -3,
    receivingHour: 11,
    occasionDaysOffset: -2,
    returnDaysOffset: -1,
    returnHour: 19,
    settlement: "depositOnly",
    settledAfterDays: 0,
    discountRatio: 0,
    penalty: 0,
    insurance: false,
    noteIndex: 0,
  },
  // --- The previous comparison window (roughly 30 to 59 days back). ---
  {
    key: "prev-new-customer",
    dressRank: 0,
    customerSlot: 7,
    status: "returned",
    createdDaysAgo: 33,
    receivingDaysOffset: -32,
    receivingHour: 11,
    occasionDaysOffset: -31,
    returnDaysOffset: -30,
    returnHour: 19,
    settlement: "settled",
    settledAfterDays: 2,
    discountRatio: 0,
    penalty: 0,
    insurance: true,
    noteIndex: 0,
  },
  {
    key: "prev-b",
    dressRank: 1,
    customerSlot: 2,
    status: "returned",
    createdDaysAgo: 38,
    receivingDaysOffset: -37,
    receivingHour: 12,
    occasionDaysOffset: -36,
    returnDaysOffset: -35,
    returnHour: 19,
    settlement: "settled",
    settledAfterDays: 2,
    discountRatio: 0.05,
    penalty: 0,
    insurance: false,
    noteIndex: 4,
  },
  {
    key: "prev-c",
    dressRank: 2,
    customerSlot: 3,
    status: "returned",
    createdDaysAgo: 43,
    receivingDaysOffset: -42,
    receivingHour: 11,
    occasionDaysOffset: -41,
    returnDaysOffset: -40,
    returnHour: 19,
    settlement: "settled",
    settledAfterDays: 3,
    discountRatio: 0,
    penalty: 0,
    insurance: true,
    noteIndex: 8,
  },
  {
    key: "prev-d",
    dressRank: 3,
    customerSlot: 4,
    status: "returned",
    createdDaysAgo: 48,
    receivingDaysOffset: -47,
    receivingHour: 12,
    occasionDaysOffset: -46,
    returnDaysOffset: -45,
    returnHour: 19,
    settlement: "settled",
    settledAfterDays: 2,
    discountRatio: 0,
    penalty: 0,
    insurance: false,
    noteIndex: 1,
  },
  {
    key: "prev-e",
    dressRank: 4,
    customerSlot: 5,
    status: "returned",
    createdDaysAgo: 52,
    receivingDaysOffset: -51,
    receivingHour: 11,
    occasionDaysOffset: -50,
    returnDaysOffset: -49,
    returnHour: 19,
    settlement: "settled",
    settledAfterDays: 2,
    discountRatio: 0,
    penalty: 0,
    insurance: true,
    noteIndex: 0,
  },
  {
    key: "prev-f",
    dressRank: 0,
    customerSlot: 6,
    status: "returned",
    createdDaysAgo: 56,
    receivingDaysOffset: -55,
    receivingHour: 12,
    occasionDaysOffset: -54,
    returnDaysOffset: -53,
    returnHour: 19,
    settlement: "partial",
    settledAfterDays: 3,
    discountRatio: 0,
    penalty: 0,
    insurance: false,
    noteIndex: 5,
  },
] as const;

/**
 * Contract value.
 *
 * `computeReservationPreview` (src/features/system/reservations/lib) defaults
 * `totalPrice` to the dress's `pricePerDay` rather than multiplying it by the
 * rental length, and the imported history agrees: a median day rate of 800
 * against a median contract of 900. So a standard one-or-two-night rental is
 * charged flat and only a longer booking carries an uplift. Multiplying by
 * nights would have inflated every revenue figure on the dashboard.
 */
function contractPrice(dress: DemoDress, rentalDays: number): number {
  const uplift = rentalDays >= 3 ? 1.5 : rentalDays === 2 ? 1.1 : 1;
  return roundToStep(dress.pricePerDay * uplift, 50);
}

function buildReservation(args: {
  spec: ReservationSpec;
  suffix: string;
  todayStart: Date;
  now: Date;
  rng: Rng;
  makeCode: ReturnType<typeof makeCodeFactory>;
  dress: DemoDress;
  customer: DemoCustomer;
  employeeUserId: string;
}): ReservationBundle {
  const {
    spec,
    suffix,
    todayStart,
    now,
    rng,
    makeCode,
    dress,
    customer,
    employeeUserId,
  } = args;
  const branch = DEMO_BRANCHES[spec.branchIndex];

  const createdAt = at(todayStart, -spec.createdDaysAgo, 10);
  const receivingDateTime = at(
    todayStart,
    spec.receivingDaysOffset,
    spec.receivingHour,
  );
  const occasionDate = at(todayStart, spec.occasionDaysOffset, 18);
  const returnDateTime = at(todayStart, spec.returnDaysOffset, spec.returnHour);

  const rentalDays = Math.max(
    1,
    Math.round(
      (returnDateTime.getTime() - receivingDateTime.getTime()) / DAY_MS,
    ),
  );

  // The late fee is part of what the customer owes, not an extra on top of it —
  // see the note on PaymentScheduleInput.contractValue.
  const totalPrice = contractPrice(dress, rentalDays) + spec.penalty;
  const discount = roundToStep(totalPrice * spec.discountRatio, 50);
  const contractValue = totalPrice - discount;

  // A balance cleared "at pickup" cannot be recorded in the future: revenue is
  // windowed on `payments.createdAt`, and a payment dated after today would
  // fall outside every range the dashboard can show — silently losing money
  // that the outstanding figure still treats as collected.
  const nominalSettledAt = new Date(
    createdAt.getTime() + spec.settledAfterDays * DAY_MS,
  );
  const cappedSettledAt = Math.min(
    nominalSettledAt.getTime(),
    now.getTime() - HOUR_MS,
  );

  const schedule = buildPaymentSchedule({
    contractValue,
    insuranceAmount: spec.insurance ? dress.insurance : 0,
    penalty: spec.penalty,
    settlement: spec.settlement,
    bookedAt: createdAt,
    settledAt: new Date(Math.max(cappedSettledAt, createdAt.getTime())),
    rng,
  });

  const reservationId = demoId("reservation", `${spec.key}:${suffix}`);

  return {
    reservation: {
      id: reservationId,
      branchId: branch.id,
      dressId: dress.id,
      customerId: customer.id,
      reservationCode: makeCode(branch.shortCode, createdAt),
      customerName: customer.name,
      customerPhone: customer.phone,
      receivingDateTime,
      occasionDate,
      returnDateTime,
      totalPrice,
      insurance: spec.insurance ? dress.insurance : 0,
      discount,
      depositPaid: schedule.depositPaid,
      totalPaid: schedule.totalPaid,
      status: spec.status,
      notes: DEMO_RESERVATION_NOTES[spec.noteIndex] ?? null,
      createdBy: employeeUserId,
      createdAt,
    },
    payments: schedule.payments.map((payment, index) => ({
      id: demoId("payment", `${reservationId}:${index}`),
      branchId: branch.id,
      reservationId,
      customerId: customer.id,
      amount: payment.amount,
      type: payment.type,
      method: payment.method,
      note: payment.note,
      createdBy: employeeUserId,
      createdAt: payment.createdAt,
    })),
  };
}

/**
 * Builds the booking-to-customer assignment for one branch's year, honouring
 * the repeat distribution from the imported history: almost every customer
 * rents once, a few come back, and nobody exceeds four bookings.
 *
 * Customers are drawn from a per-branch block, so a repeat customer returns to
 * the branch that already knows her — which is how the real records read, and
 * what makes the per-branch customer counts add up.
 */
function buildCustomerQueue(
  bookings: number,
  offset: number,
  rng: Rng,
): { queue: number[]; used: number } {
  const queue: number[] = [];
  let cursor = offset;

  while (queue.length < bookings) {
    const repeats = rng.weighted(CUSTOMER_REPEAT_WEIGHTS);
    for (let n = 0; n < repeats && queue.length < bookings; n += 1) {
      queue.push(cursor);
    }
    cursor += 1;
  }

  // Shuffle, so a repeat customer's bookings land months apart rather than back
  // to back.
  for (let i = queue.length - 1; i > 0; i -= 1) {
    const j = rng.int(0, i);
    [queue[i], queue[j]] = [queue[j], queue[i]];
  }

  return { queue, used: cursor - offset };
}

const RENTAL_LENGTH_WEIGHTS = [
  [1, 30],
  [2, 50],
  [3, 20],
] as const satisfies readonly (readonly [number, number])[];

const RESERVED_SETTLEMENTS = [
  ["depositOnly", 60],
  ["partial", 25],
  ["settled", 15],
] as const satisfies readonly (readonly [SettlementShape, number])[];

/** Recently closed: some balances are still being chased. */
const RECENT_SETTLEMENTS = [
  ["settled", 80],
  ["partial", 13],
  ["depositOnly", 7],
] as const satisfies readonly (readonly [SettlementShape, number])[];

/**
 * Closed months ago. A real atelier chases its receivables, so an old booking is
 * almost always square — applying the recent rate across the whole year left
 * 210 open balances on one branch, which reads as a business that never
 * collects rather than one with healthy books.
 */
const AGED_SETTLEMENTS = [
  ["settled", 97],
  ["partial", 3],
] as const satisfies readonly (readonly [SettlementShape, number])[];

/** Past this many days, a closed booking counts as aged. */
const RECEIVABLE_CHASE_DAYS = 45;

/**
 * Fills a branch's year: `annualReservations` bookings across the last 365 days,
 * skewed toward the recent end so the business reads as growing, and spread
 * over the portfolio by the popularity curve.
 */
function buildBranchHistory(args: {
  branchIndex: number;
  todayStart: Date;
  now: Date;
  rng: Rng;
  makeCode: ReturnType<typeof makeCodeFactory>;
  calendar: DressCalendar;
  customers: readonly DemoCustomer[];
  customerQueue: number[];
  targets: number[];
  curatedUsed: Map<number, number>;
  employeeIdForBranch: (branchIndex: number) => string;
}): ReservationBundle[] {
  const {
    branchIndex,
    todayStart,
    now,
    rng,
    makeCode,
    calendar,
    customers,
    customerQueue,
    targets,
    curatedUsed,
    employeeIdForBranch,
  } = args;

  const branchDresses = DEMO_DRESSES.filter(
    (dress) => dress.branchIndex === branchIndex,
  );
  const bundles: ReservationBundle[] = [];
  let queueCursor = 0;

  for (const dress of branchDresses) {
    const remaining =
      (targets[dress.rank] ?? 0) - (curatedUsed.get(dress.rank) ?? 0);

    for (let n = 0; n < remaining; n += 1) {
      const bookedDaysAgo = Math.max(
        0,
        Math.round(rng.next() ** 1.25 * HISTORY_DAYS),
      );
      const rentalDays = rng.weighted(RENTAL_LENGTH_WEIGHTS);

      const placed = calendar.place(
        dress.id,
        -bookedDaysAgo + rng.int(3, 45),
        rentalDays,
        dress.currentStatus !== "available",
      );
      if (!placed) continue;

      const customerIndex =
        customerQueue[queueCursor % customerQueue.length] ?? 0;
      queueCursor += 1;
      const customer = customers[customerIndex];
      if (!customer) continue;

      const receivingDaysOffset = placed.start;
      const returnDaysOffset = placed.end;
      // Booked in advance of the pickup. Derived after placement, because the
      // calendar may have walked the rental backwards to avoid a clash and a
      // booking cannot predate itself.
      const createdDaysAgo = Math.max(1, -receivingDaysOffset + rng.int(3, 45));

      // Status follows physics rather than a quota: a booking whose return is
      // past is back, one whose pickup is still ahead is reserved, and anything
      // spanning today is out with the customer.
      let status: ReservationStatus;
      if (returnDaysOffset < 0) {
        // A slice of the recent returns are still uncollected, which is where
        // the overdue-returns figure gets volume beyond the curated pair.
        status =
          returnDaysOffset >= -7 && rng.chance(0.18) ? "pickedUp" : "returned";
      } else if (receivingDaysOffset > 0) {
        status = "reserved";
      } else {
        status = "pickedUp";
      }
      if (status === "returned" && rng.chance(0.045)) status = "cancelled";

      const spec: ReservationSpec = {
        key: `history-${branchIndex}-${dress.rank}-${n}`,
        branchIndex,
        customerIndex,
        status,
        createdDaysAgo,
        receivingDaysOffset,
        receivingHour: rng.int(10, 15),
        occasionDaysOffset: Math.min(receivingDaysOffset + 1, returnDaysOffset),
        returnDaysOffset,
        returnHour: 19,
        settlement:
          status === "reserved"
            ? rng.weighted(RESERVED_SETTLEMENTS)
            : returnDaysOffset < -RECEIVABLE_CHASE_DAYS
              ? rng.weighted(AGED_SETTLEMENTS)
              : rng.weighted(RECENT_SETTLEMENTS),
        // The balance is cleared at pickup, which is what the counter does.
        settledAfterDays: Math.max(0, createdDaysAgo + receivingDaysOffset),
        discountRatio: rng.chance(0.15) ? 0.05 : 0,
        penalty:
          status === "returned" && rng.chance(PENALTY_RATE)
            ? roundToStep(dress.pricePerDay * 0.25, 50)
            : 0,
        insurance: rng.chance(INSURANCE_RATE),
        noteIndex: rng.int(0, DEMO_RESERVATION_NOTES.length - 1),
      };

      bundles.push(
        buildReservation({
          spec,
          suffix: "history",
          todayStart,
          now,
          rng,
          makeCode,
          dress,
          customer,
          employeeUserId: employeeIdForBranch(branchIndex),
        }),
      );
    }
  }

  return bundles;
}

const EXPENSE_PLAN: readonly {
  type: ExpenseType;
  /** Share of the branch's monthly revenue. */
  scale: number;
  step: number;
  jitter: number;
  withDress: boolean;
  withEmployee: boolean;
  /** Months between occurrences. 1 = every month. */
  everyMonths: number;
}[] = [
  {
    type: "salary",
    scale: 0.26,
    step: 500,
    jitter: 0.08,
    withDress: false,
    withEmployee: true,
    everyMonths: 1,
  },
  {
    type: "custom",
    scale: 0.17,
    step: 500,
    jitter: 0.05,
    withDress: false,
    withEmployee: false,
    everyMonths: 1,
  },
  {
    type: "drycleaning",
    scale: 0.05,
    step: 50,
    jitter: 0.25,
    withDress: true,
    withEmployee: false,
    everyMonths: 1,
  },
  {
    type: "tailoring",
    scale: 0.04,
    step: 50,
    jitter: 0.3,
    withDress: true,
    withEmployee: false,
    everyMonths: 1,
  },
  {
    type: "dressAcquisition",
    scale: 0.22,
    step: 500,
    jitter: 0.2,
    withDress: true,
    withEmployee: false,
    everyMonths: 3,
  },
] as const;

/**
 * Twelve months of running costs per branch, sized from the revenue that branch
 * actually booked. Every branch therefore shows a positive net profit without
 * the smallest one looking implausibly cheap to run, and every expense type is
 * present in the current window so the breakdown card is never a single bar.
 */
function buildExpenses(args: {
  todayStart: Date;
  rng: Rng;
  monthlyRevenue: readonly number[];
  employeeIdForBranch: (branchIndex: number) => string;
}): Array<typeof ExpensesTable.$inferInsert> {
  const { todayStart, rng, monthlyRevenue, employeeIdForBranch } = args;
  const rows: Array<typeof ExpensesTable.$inferInsert> = [];

  for (const [branchIndex, branch] of DEMO_BRANCHES.entries()) {
    const branchDresses = DEMO_DRESSES.filter(
      (dress) => dress.branchIndex === branchIndex,
    );
    const budget = monthlyRevenue[branchIndex] ?? 0;

    for (let month = 0; month < 12; month += 1) {
      for (const [planIndex, plan] of EXPENSE_PLAN.entries()) {
        if (month % plan.everyMonths !== 0) continue;

        // Day 6 of each month back, so every row sits well inside a calendar
        // month rather than on a boundary the range picker straddles.
        const recordedAt = at(todayStart, -(month * 30 + 6), 12);
        const swing = 1 + (rng.next() * 2 - 1) * plan.jitter;

        rows.push({
          id: demoId("expense", `${branchIndex}:${month}:${planIndex}`),
          branchId: branch.id,
          type: plan.type,
          amount: Math.max(
            plan.step,
            roundToStep(budget * plan.scale * swing, plan.step),
          ),
          dressId: plan.withDress ? rng.pick(branchDresses).id : null,
          employeeId: plan.withEmployee
            ? employeeIdForBranch(branchIndex)
            : null,
          description: rng.pick(DEMO_EXPENSE_DESCRIPTIONS[plan.type]),
          note: null,
          // `expenses.date` is a Postgres DATE and the dashboard windows it
          // with toLocalDateString, so it is rendered through the same function
          // in the same business timezone — anything else is an off-by-one
          // waiting to happen.
          date: toLocalDateString(recordedAt),
          createdBy: DEMO_ACTOR,
          createdAt: recordedAt,
        });
      }
    }
  }

  return rows;
}

/**
 * Builds the whole demo dataset as plain rows. Pure: the only inputs are the
 * fixtures, `DEMO_SEED` and the single `now` captured by the caller, so the
 * same command on the same day produces the same database.
 */
export function buildDemoDataset(now: Date): DemoDataset {
  const todayStart = startOfLocalDay(now);
  const rng = createRng(DEMO_SEED);
  const makeCode = makeCodeFactory();
  const calendar = new DressCalendar();

  const employeeIdForBranch = (branchIndex: number): string => {
    const employee = DEMO_EMPLOYEES.find((candidate) =>
      candidate.branchIndexes.includes(branchIndex),
    );
    if (!employee) {
      throw new Error(`No demo employee covers branch ${branchIndex}.`);
    }
    return employee.id;
  };

  // Customer pools are sized before anything else is generated, because the
  // held-out block has to sit at a known offset: a customer used by a curated
  // booking must never also appear in the generated year, or she stops counting
  // as newly acquired in the window that booking sits in.
  const queues = new Map<number, number[]>();
  let customerCursor = HELD_CUSTOMERS;
  for (const [branchIndex, branch] of DEMO_BRANCHES.entries()) {
    const { queue, used } = buildCustomerQueue(
      branch.annualReservations,
      customerCursor,
      rng,
    );
    queues.set(branchIndex, queue);
    customerCursor += used;
  }
  const customerFixtures = buildDemoCustomers(customerCursor);

  const branches = DEMO_BRANCHES.map((branch) => ({
    id: branch.id,
    shortCode: branch.shortCode,
    nameEn: branch.nameEn,
    nameAr: branch.nameAr,
    addressEn: branch.addressEn,
    addressAr: branch.addressAr,
    phone: branch.phone,
    opensAt: branch.opensAt,
    closesAt: branch.closesAt,
  }));

  const employees = DEMO_EMPLOYEES.map((employee, index) => ({
    id: employee.id,
    createdBy: DEMO_ACTOR,
    email: employee.email,
    name: employee.name,
    phone: employee.phone,
    role: "employee" as const,
    age: employee.age,
    createdAt: at(todayStart, -(400 + index * 30), 9),
    emailVerifiedAt: at(todayStart, -(399 + index * 30), 9),
    lastSignInAt: at(todayStart, -(index % 4), 9),
  }));

  const memberships: Array<typeof BranchMembershipsTable.$inferInsert> = [
    // The admin sees every branch, so the branch switcher has something to
    // switch between during the walkthrough.
    ...DEMO_BRANCHES.map((branch, index) => ({
      userId: SEED_ADMIN_ID,
      branchId: branch.id,
      isCurrent: index === 0,
    })),
    ...DEMO_EMPLOYEES.flatMap((employee) =>
      employee.branchIndexes.map((branchIndex, position) => ({
        userId: employee.id,
        branchId: DEMO_BRANCHES[branchIndex].id,
        isCurrent: position === 0,
      })),
    ),
  ];

  // Curated bookings first: they claim their dates on the dress calendar, and
  // the generated year is filled around them.
  const curated: ReservationBundle[] = [];
  const curatedUsedByBranch = new Map<number, Map<number, number>>();

  for (const [branchIndex, branch] of DEMO_BRANCHES.entries()) {
    const used = new Map<number, number>();
    curatedUsedByBranch.set(branchIndex, used);

    for (const template of CURATED_SPECS) {
      const dress = DEMO_DRESSES.find(
        (candidate) =>
          candidate.branchIndex === branchIndex &&
          candidate.rank === template.dressRank,
      );
      const customerIndex =
        branchIndex * HELD_CUSTOMERS_PER_BRANCH + template.customerSlot;
      const customer = customerFixtures[customerIndex];

      if (!dress || !customer) {
        throw new Error(
          `Curated booking "${template.key}" on ${branch.shortCode} is missing its dress or customer.`,
        );
      }

      calendar.place(
        dress.id,
        template.receivingDaysOffset,
        template.returnDaysOffset - template.receivingDaysOffset,
        false,
      );

      curated.push(
        buildReservation({
          spec: { ...template, branchIndex, customerIndex },
          suffix: `b${branchIndex}`,
          todayStart,
          now,
          rng,
          makeCode,
          dress,
          customer,
          employeeUserId: employeeIdForBranch(branchIndex),
        }),
      );

      // Cancelled rows are excluded from `countableReservation`, so they do not
      // count toward timesRented and must not consume backfill budget.
      if (template.status !== "cancelled") {
        used.set(template.dressRank, (used.get(template.dressRank) ?? 0) + 1);
      }
    }
  }

  const history = DEMO_BRANCHES.flatMap((branch, branchIndex) =>
    buildBranchHistory({
      branchIndex,
      todayStart,
      now,
      rng,
      makeCode,
      calendar,
      customers: customerFixtures,
      customerQueue: queues.get(branchIndex) ?? [],
      targets: buildRentalTargets(
        branch.dressCount,
        branch.topDressRentals,
        branch.annualReservations,
      ),
      curatedUsed: curatedUsedByBranch.get(branchIndex) ?? new Map(),
      employeeIdForBranch,
    }),
  );

  const bundles = [...curated, ...history];
  const reservations = bundles.map((bundle) => bundle.reservation);
  const payments = bundles.flatMap((bundle) => bundle.payments);

  // `timesRented` / `lastReservedAt` / `lastReservationAt` are derived from the
  // rows just generated, using the same `countableReservation` rule
  // refreshReservationStats applies — so a booking made in the app recomputes
  // them to the value already on screen instead of jumping.
  const countable = reservations.filter(
    (reservation) => reservation.status !== "cancelled",
  );

  const byDress = new Map<string, { count: number; last: Date }>();
  const byCustomer = new Map<string, { first: Date; last: Date }>();
  for (const reservation of countable) {
    const createdAt = reservation.createdAt as Date;

    const dressEntry = byDress.get(reservation.dressId);
    if (!dressEntry)
      byDress.set(reservation.dressId, { count: 1, last: createdAt });
    else {
      dressEntry.count += 1;
      if (createdAt > dressEntry.last) dressEntry.last = createdAt;
    }

    const customerEntry = byCustomer.get(reservation.customerId);
    if (!customerEntry) {
      byCustomer.set(reservation.customerId, {
        first: createdAt,
        last: createdAt,
      });
    } else {
      if (createdAt > customerEntry.last) customerEntry.last = createdAt;
      if (createdAt < customerEntry.first) customerEntry.first = createdAt;
    }
  }

  const dresses = DEMO_DRESSES.map((dress) => {
    const stats = byDress.get(dress.id);
    return {
      id: dress.id,
      branchId: DEMO_BRANCHES[dress.branchIndex].id,
      code: dress.code,
      title: dress.title,
      description: dress.description,
      images: dress.images,
      size: dress.size,
      color: dress.color,
      pricePerDay: dress.pricePerDay,
      depositAmount: dress.depositAmount,
      insurance: dress.insurance,
      isActive: true,
      currentStatus: dress.currentStatus,
      timesRented: stats?.count ?? 0,
      lastReservedAt: stats?.last ?? null,
      createdBy: DEMO_ACTOR,
      createdAt: at(todayStart, -(HISTORY_DAYS + 45 + dress.rank), 9),
    };
  });

  const customers = customerFixtures.map((customer) => {
    const stats = byCustomer.get(customer.id);
    return {
      id: customer.id,
      userId: null,
      name: customer.name,
      phone: customer.phone,
      note: customer.note,
      lastReservationAt: stats?.last ?? null,
      createdAt: stats?.first ?? at(todayStart, -HISTORY_DAYS, 9),
    };
  });

  // Expense budgets are read off the revenue each branch actually booked, so no
  // branch can end up spending more than it earns.
  const monthlyRevenue = DEMO_BRANCHES.map((branch) => {
    const total = countable
      .filter((reservation) => reservation.branchId === branch.id)
      .reduce((sum, reservation) => sum + (reservation.totalPaid ?? 0), 0);
    return total / 12;
  });

  const expenses = buildExpenses({
    todayStart,
    rng,
    monthlyRevenue,
    employeeIdForBranch,
  });

  return {
    branches,
    employees,
    memberships,
    dresses,
    customers,
    reservations,
    payments,
    expenses,
  };
}
