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
import type { ReservationStatus } from "@/drizzle/schemas/system/reservations-table";
import { toLocalDateString } from "@/features/system/dashboard/lib/dates";

import { SEED_ADMIN_ID } from "../constants";
import { DEMO_ACTOR } from "../demo/constants";
import { demoId } from "../demo/ids";
import { buildPaymentSchedule, type SettlementShape } from "../demo/payments";
import { createRng, type Rng } from "../demo/rng";
import {
  buildLamsaCustomers,
  LAMSA_BRANCH,
  LAMSA_DRESSES,
  LAMSA_EMPLOYEES,
  LAMSA_EXPENSES,
  LAMSA_RESERVATION_NOTES,
  type LamsaCustomer,
  type LamsaDress,
  lamsaDressCode,
  lamsaDressImagePath,
} from "./fixtures";

const LAMSA_SEED = 20_261_102;
const HOUR_MS = 60 * 60 * 1_000;
const DAY_MS = 24 * HOUR_MS;
/** How far back the trading history reaches; enough for "this month vs last". */
const HISTORY_DAYS = 120;
const CUSTOMER_COUNT = 90;

export type LamsaDataset = {
  branch: typeof BranchesTable.$inferInsert;
  employees: Array<typeof UsersTable.$inferInsert>;
  memberships: Array<typeof BranchMembershipsTable.$inferInsert>;
  dresses: Array<typeof DressesTable.$inferInsert>;
  customers: Array<typeof RentalCustomersTable.$inferInsert>;
  reservations: Array<typeof ReservationsTable.$inferInsert>;
  payments: Array<typeof PaymentsTable.$inferInsert>;
  expenses: Array<typeof ExpensesTable.$inferInsert>;
};

/**
 * One booking before it is priced: which dress, when, and how it ends up. The
 * money is filled in by {@link buildReservation} from
 * {@link buildPaymentSchedule}, which is the only thing allowed to produce a
 * `totalPaid` (see docs/seeding-and-demo-data.md, "Money consistency").
 */
type BookingSpec = {
  key: string;
  dress: LamsaDress;
  /** Day of the wedding/event, as an offset from today. */
  occasionDay: number;
  /** Days between taking the booking and the occasion. */
  leadDays: number;
  status: ReservationStatus;
  settlement: SettlementShape;
  withInsurance: boolean;
};

function startOfLocalDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function at(dayStart: Date, dayOffset: number, hour: number): Date {
  return new Date(dayStart.getTime() + dayOffset * DAY_MS + hour * HOUR_MS);
}

function roundToStep(value: number, step: number): number {
  return Math.round(value / step) * step;
}

function dressInsurance(dress: LamsaDress): number {
  return dress.kind === "bridal" ? 2000 : dress.kind === "soiree" ? 500 : 1000;
}

/**
 * The next 30 days, placed by hand so the screenshots have something to show:
 * dress 1 is booked on five dates (its date picker shows them blocked), two
 * rentals are out right now, and the rest spread across the month.
 */
const UPCOMING: readonly {
  rank: number;
  day: number;
  status?: ReservationStatus;
  settlement?: SettlementShape;
}[] = [
  // Out with the customer today.
  { rank: 2, day: 0, status: "pickedUp", settlement: "settled" },
  { rank: 10, day: 1, status: "pickedUp", settlement: "partial" },
  // The hero dress: several blocked days in its calendar.
  { rank: 1, day: 3 },
  { rank: 1, day: 9 },
  { rank: 1, day: 15, settlement: "partial" },
  { rank: 1, day: 22 },
  { rank: 1, day: 28 },
  { rank: 3, day: 2 },
  { rank: 3, day: 12 },
  { rank: 3, day: 24 },
  { rank: 4, day: 5 },
  { rank: 4, day: 19 },
  { rank: 5, day: 7 },
  { rank: 5, day: 26, status: "cancelled" },
  { rank: 6, day: 11 },
  { rank: 7, day: 4 },
  { rank: 7, day: 18 },
  { rank: 8, day: 6, settlement: "partial" },
  { rank: 8, day: 20 },
  { rank: 9, day: 8 },
  { rank: 9, day: 23 },
  { rank: 11, day: 3 },
  { rank: 11, day: 14 },
  { rank: 12, day: 10 },
  { rank: 12, day: 27 },
  { rank: 13, day: 6 },
  { rank: 13, day: 16 },
];

/** Past rentals per dress over {@link HISTORY_DAYS}, by how often each kind turns. */
const HISTORY_PER_KIND: Record<LamsaDress["kind"], number> = {
  bridal: 3,
  katbKetab: 4,
  engagement: 4,
  soiree: 5,
};

function buildSpecs(rng: Rng): BookingSpec[] {
  const specs: BookingSpec[] = [];
  const dressByRank = new Map(
    LAMSA_DRESSES.map((dress) => [dress.rank, dress]),
  );

  for (const [index, entry] of UPCOMING.entries()) {
    const dress = dressByRank.get(entry.rank);
    if (!dress) throw new Error(`No Lamsa dress with rank ${entry.rank}.`);
    specs.push({
      key: `up:${index}`,
      dress,
      occasionDay: entry.day,
      // Taken 3–40 days ago: an upcoming booking is never "booked today" en
      // masse, which is how a clamped future date would otherwise read.
      leadDays: entry.day + rng.int(3, 40),
      status: entry.status ?? "reserved",
      settlement: entry.settlement ?? "depositOnly",
      withInsurance: dress.kind === "bridal",
    });
  }

  // History is laid out backwards from a week ago, a few weeks apart per dress,
  // so no two rentals of the same dress overlap.
  for (const dress of LAMSA_DRESSES) {
    const count = HISTORY_PER_KIND[dress.kind];
    const spacing = Math.floor((HISTORY_DAYS - 10) / count);
    for (let n = 0; n < count; n += 1) {
      const occasionDay = -(
        5 +
        n * spacing +
        rng.int(0, Math.max(1, spacing - 6))
      );
      // A booking from the last fortnight is still occasionally unpaid; anything
      // older has been chased and settled.
      const settlement: SettlementShape =
        occasionDay > -14 && rng.next() < 0.4 ? "partial" : "settled";
      specs.push({
        key: `past:${dress.rank}:${n}`,
        dress,
        occasionDay,
        leadDays: 7 + rng.int(0, 35),
        status: "returned",
        settlement,
        withInsurance: dress.kind === "bridal" && rng.next() < 0.5,
      });
    }
  }

  return specs;
}

function makeCodeFactory() {
  const counters = new Map<string, number>();
  return (createdAt: Date): string => {
    const year = createdAt.getFullYear();
    const month = String(createdAt.getMonth() + 1).padStart(2, "0");
    const day = String(createdAt.getDate()).padStart(2, "0");
    const key = `${LAMSA_BRANCH.shortCode}-${year}${month}${day}`;
    const next = (counters.get(key) ?? 0) + 1;
    counters.set(key, next);
    return `RES-${key}-${String(next).padStart(3, "0")}`;
  };
}

function buildReservation(args: {
  spec: BookingSpec;
  customer: LamsaCustomer;
  employeeId: string;
  noteIndex: number;
  todayStart: Date;
  now: Date;
  rng: Rng;
  makeCode: ReturnType<typeof makeCodeFactory>;
}) {
  const {
    spec,
    customer,
    employeeId,
    noteIndex,
    todayStart,
    now,
    rng,
    makeCode,
  } = args;

  // Pickup the evening before, back the morning after.
  const receivingDateTime = at(todayStart, spec.occasionDay - 1, 19);
  const occasionDate = at(todayStart, spec.occasionDay, 18);
  const returnDateTime = at(todayStart, spec.occasionDay + 1, 13);

  // A booking cannot have been taken in the future.
  const createdAt = new Date(
    Math.min(
      at(todayStart, spec.occasionDay - spec.leadDays, 13).getTime(),
      now.getTime() - 3 * HOUR_MS,
    ),
  );

  const totalPrice = spec.dress.pricePerDay;
  const discount =
    spec.status !== "cancelled" && rng.next() < 0.15
      ? roundToStep(totalPrice * 0.1, 50)
      : 0;
  const insurance = spec.withInsurance ? dressInsurance(spec.dress) : 0;

  // Revenue is windowed on payments.createdAt, so nothing may be dated after now.
  const settledAt = new Date(
    Math.max(
      createdAt.getTime(),
      Math.min(receivingDateTime.getTime(), now.getTime() - HOUR_MS),
    ),
  );

  const schedule = buildPaymentSchedule({
    contractValue: totalPrice - discount,
    insuranceAmount: insurance,
    penalty: 0,
    settlement: spec.settlement,
    bookedAt: createdAt,
    settledAt,
    rng,
  });

  const reservationId = demoId("lamsa-reservation", spec.key);

  return {
    reservation: {
      id: reservationId,
      branchId: LAMSA_BRANCH.id,
      dressId: demoId("lamsa-dress", spec.dress.rank),
      customerId: customer.id,
      reservationCode: makeCode(createdAt),
      customerName: customer.name,
      customerPhone: customer.phone,
      receivingDateTime,
      occasionDate,
      returnDateTime,
      totalPrice,
      insurance,
      discount,
      depositPaid: schedule.depositPaid,
      totalPaid: schedule.totalPaid,
      status: spec.status,
      notes:
        LAMSA_RESERVATION_NOTES[noteIndex % LAMSA_RESERVATION_NOTES.length],
      createdBy: employeeId,
      createdAt,
    } satisfies typeof ReservationsTable.$inferInsert,
    payments: schedule.payments.map((payment, index) => ({
      id: demoId("lamsa-payment", `${reservationId}:${index}`),
      branchId: LAMSA_BRANCH.id,
      reservationId,
      customerId: customer.id,
      amount: payment.amount,
      type: payment.type,
      method: payment.method,
      note: null,
      createdBy: employeeId,
      createdAt: payment.createdAt,
    })) satisfies Array<typeof PaymentsTable.$inferInsert>,
  };
}

function buildExpenses(todayStart: Date, rng: Rng) {
  const rows: Array<typeof ExpensesTable.$inferInsert> = [];
  const months = Math.ceil(HISTORY_DAYS / 30);
  for (let month = 0; month < months; month += 1) {
    for (const [index, plan] of LAMSA_EXPENSES.entries()) {
      const recordedAt = at(todayStart, -(month * 30 + 3), 12);
      const swing =
        plan.type === "salary" || plan.type === "custom"
          ? 1
          : 0.8 + rng.next() * 0.4;
      rows.push({
        id: demoId("lamsa-expense", `${month}:${index}`),
        branchId: LAMSA_BRANCH.id,
        type: plan.type,
        amount: roundToStep(plan.amount * swing, 50),
        dressId:
          plan.type === "drycleaning" || plan.type === "tailoring"
            ? demoId("lamsa-dress", rng.pick(LAMSA_DRESSES).rank)
            : null,
        employeeId: plan.type === "salary" ? LAMSA_EMPLOYEES[0].id : null,
        description: plan.description,
        note: null,
        date: toLocalDateString(recordedAt),
        createdBy: DEMO_ACTOR,
        createdAt: recordedAt,
      });
    }
  }
  return rows;
}

/**
 * Builds the whole Lamsa dataset as plain rows. Pure and deterministic for a
 * given day: every timestamp is an offset from today's local midnight, so the
 * "next 30 days" stay in the next 30 days whenever it is re-run.
 */
export function buildLamsaDataset(now: Date): LamsaDataset {
  const todayStart = startOfLocalDay(now);
  const rng = createRng(LAMSA_SEED);
  const makeCode = makeCodeFactory();
  const customerFixtures = buildLamsaCustomers(CUSTOMER_COUNT);

  const specs = buildSpecs(rng).sort((a, b) => a.occasionDay - b.occasionDay);
  const bundles = specs.map((spec, index) =>
    buildReservation({
      spec,
      // Brides almost never rent twice, so each booking gets its own customer.
      customer: customerFixtures[index % customerFixtures.length],
      employeeId: LAMSA_EMPLOYEES[index % LAMSA_EMPLOYEES.length].id,
      noteIndex: index,
      todayStart,
      now,
      rng,
      makeCode,
    }),
  );

  const reservations = bundles.map((bundle) => bundle.reservation);
  const payments = bundles.flatMap((bundle) => bundle.payments);

  // Same `countableReservation` rule the app's stats refresh applies.
  const countable = reservations.filter(
    (reservation) => reservation.status !== "cancelled",
  );
  const lastByDress = new Map<string, { count: number; last: Date }>();
  const spanByCustomer = new Map<string, { first: Date; last: Date }>();
  for (const reservation of countable) {
    const created = reservation.createdAt;
    const dressStats = lastByDress.get(reservation.dressId);
    lastByDress.set(reservation.dressId, {
      count: (dressStats?.count ?? 0) + 1,
      last: dressStats && dressStats.last > created ? dressStats.last : created,
    });
    const span = spanByCustomer.get(reservation.customerId);
    spanByCustomer.set(reservation.customerId, {
      first: span && span.first < created ? span.first : created,
      last: span && span.last > created ? span.last : created,
    });
  }

  const usedCustomerIds = new Set(reservations.map((r) => r.customerId));

  return {
    branch: { ...LAMSA_BRANCH },
    employees: LAMSA_EMPLOYEES.map((employee, index) => ({
      id: employee.id,
      createdBy: DEMO_ACTOR,
      email: employee.email,
      name: employee.name,
      phone: employee.phone,
      role: "employee" as const,
      age: employee.age,
      createdAt: at(todayStart, -(HISTORY_DAYS + 60 + index * 20), 9),
      emailVerifiedAt: at(todayStart, -(HISTORY_DAYS + 59 + index * 20), 9),
      lastSignInAt: at(todayStart, -index, 11),
    })),
    memberships: [
      { userId: SEED_ADMIN_ID, branchId: LAMSA_BRANCH.id, isCurrent: true },
      ...LAMSA_EMPLOYEES.map((employee) => ({
        userId: employee.id,
        branchId: LAMSA_BRANCH.id,
        isCurrent: true,
      })),
    ],
    dresses: LAMSA_DRESSES.map((dress) => {
      const id = demoId("lamsa-dress", dress.rank);
      const stats = lastByDress.get(id);
      return {
        id,
        branchId: LAMSA_BRANCH.id,
        code: lamsaDressCode(dress.rank),
        title: dress.title,
        description: dress.description,
        images: [lamsaDressImagePath(dress.rank)],
        size: dress.size,
        color: dress.color,
        pricePerDay: dress.pricePerDay,
        depositAmount: roundToStep(dress.pricePerDay * 0.3, 50),
        insurance: dressInsurance(dress),
        isActive: true,
        currentStatus: "available" as const,
        timesRented: stats?.count ?? 0,
        lastReservedAt: stats?.last ?? null,
        createdBy: DEMO_ACTOR,
        createdAt: at(todayStart, -(HISTORY_DAYS + 30 + dress.rank), 10),
      };
    }),
    customers: customerFixtures
      .filter((customer) => usedCustomerIds.has(customer.id))
      .map((customer) => {
        const span = spanByCustomer.get(customer.id);
        return {
          id: customer.id,
          userId: null,
          name: customer.name,
          phone: customer.phone,
          note: null,
          lastReservationAt: span?.last ?? null,
          createdAt: span?.first ?? at(todayStart, -HISTORY_DAYS, 10),
        };
      }),
    reservations,
    payments,
    expenses: buildExpenses(todayStart, rng),
  };
}
