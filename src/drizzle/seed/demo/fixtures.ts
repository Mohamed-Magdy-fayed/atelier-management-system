import type { DressCurrentStatus } from "@/drizzle/schemas/system/dresses-table";

import { FIRST_NAMES, LAST_NAMES } from "../core";
import { DEMO_PHONE } from "./constants";
import { demoId } from "./ids";

/**
 * Curated, publication-safe fixtures for the `demo` profile.
 *
 * This data is filmed and shown to competing businesses, so every value is
 * synthetic: names are composed from the shared synthetic name lists, phones sit
 * in a reserved all-zero block, emails are `@example.com`, and nothing is copied
 * from a real customer, address or contact.
 *
 * The portfolio and customer base are GENERATED rather than hand-written —
 * a believable year of trading needs a few hundred dresses and well over a
 * thousand customers, which is past the point where listing them by hand stays
 * reviewable.
 */

export type DemoBranch = {
  id: string;
  shortCode: string;
  nameEn: string;
  nameAr: string;
  addressEn: string;
  addressAr: string;
  phone: string;
  opensAt: string;
  closesAt: string;
  /** Size of this branch's rentable portfolio. */
  dressCount: number;
  /** Countable reservations this branch takes across the seeded year. */
  annualReservations: number;
  /** Lifetime rentals on its single most-booked dress. */
  topDressRentals: number;
  /** Dresses parked in each maintenance state right now. */
  maintenance: { atTailor: number; atDryCleaner: number; underRepair: number };
};

/**
 * Three branches of deliberately different sizes — 800 / 500 / 300 bookings a
 * year — so the branch switcher shows a real spread rather than three clones,
 * and so every per-branch figure on the dashboard visibly changes when the
 * active branch changes.
 *
 * The dress counts hold the ratio the imported history shows (roughly ten
 * reservations per dress per year); inventing a portfolio that could not
 * physically service the booking volume is the kind of detail an atelier owner
 * notices immediately.
 */
export const DEMO_BRANCHES: readonly DemoBranch[] = [
  {
    id: demoId("branch", 1),
    shortCode: "ZML",
    nameEn: "Zamalek Atelier",
    nameAr: "أتيليه الزمالك",
    addressEn: "Demo Building, Abu El Feda Street, Zamalek, Cairo",
    addressAr: "مبنى العرض، شارع أبو الفدا، الزمالك، القاهرة",
    phone: `${DEMO_PHONE.prefix}${DEMO_PHONE.branchBlock + 1}`,
    opensAt: "11:00:00",
    closesAt: "22:00:00",
    dressCount: 75,
    annualReservations: 800,
    topDressRentals: 55,
    maintenance: { atTailor: 3, atDryCleaner: 2, underRepair: 2 },
  },
  {
    id: demoId("branch", 2),
    shortCode: "NCR",
    nameEn: "New Cairo Atelier",
    nameAr: "أتيليه القاهرة الجديدة",
    addressEn: "Demo Plaza, 90th Street, Fifth Settlement, New Cairo",
    addressAr: "بلازا العرض، الشارع التسعين، التجمع الخامس، القاهرة الجديدة",
    phone: `${DEMO_PHONE.prefix}${DEMO_PHONE.branchBlock + 2}`,
    opensAt: "12:00:00",
    closesAt: "23:00:00",
    dressCount: 48,
    annualReservations: 500,
    topDressRentals: 40,
    maintenance: { atTailor: 2, atDryCleaner: 2, underRepair: 1 },
  },
  {
    id: demoId("branch", 3),
    shortCode: "HLP",
    nameEn: "Heliopolis Atelier",
    nameAr: "أتيليه مصر الجديدة",
    addressEn: "Demo Centre, Al Ahram Street, Heliopolis, Cairo",
    addressAr: "مركز العرض، شارع الأهرام، مصر الجديدة، القاهرة",
    phone: `${DEMO_PHONE.prefix}${DEMO_PHONE.branchBlock + 3}`,
    opensAt: "11:00:00",
    closesAt: "21:00:00",
    dressCount: 30,
    annualReservations: 300,
    topDressRentals: 28,
    maintenance: { atTailor: 2, atDryCleaner: 1, underRepair: 1 },
  },
] as const;

export type DemoEmployee = {
  id: string;
  name: string;
  email: string;
  phone: string;
  age: number;
  /** Indexes into DEMO_BRANCHES. Two employees cover more than one branch. */
  branchIndexes: readonly number[];
};

const EMPLOYEE_SEEDS: readonly {
  name: string;
  local: string;
  age: number;
  branchIndexes: readonly number[];
}[] = [
  { name: "Salma Farouk", local: "salma", age: 31, branchIndexes: [0] },
  { name: "Youssef Nabil", local: "youssef", age: 27, branchIndexes: [0] },
  { name: "Mariam Shawky", local: "mariam", age: 35, branchIndexes: [0] },
  { name: "Hana Mansour", local: "hana", age: 29, branchIndexes: [1] },
  { name: "Omar Refaat", local: "omar", age: 33, branchIndexes: [1] },
  { name: "Reem Helmy", local: "reem", age: 26, branchIndexes: [2] },
  // Multi-branch staff — the branch switcher needs members who see more than
  // one branch, and the employees grid needs the multiselect to have something
  // to show.
  { name: "Dina Khalifa", local: "dina", age: 38, branchIndexes: [0, 1] },
  { name: "Tarek Younis", local: "tarek", age: 41, branchIndexes: [1, 2] },
] as const;

export const DEMO_EMPLOYEES: readonly DemoEmployee[] = EMPLOYEE_SEEDS.map(
  (seed, index) => ({
    id: demoId("employee", index + 1),
    name: seed.name,
    email: `${seed.local}.demo@example.com`,
    phone: `${DEMO_PHONE.prefix}${DEMO_PHONE.employeeBlock + index + 1}`,
    age: seed.age,
    branchIndexes: seed.branchIndexes,
  }),
);

export type DemoDress = {
  id: string;
  code: string;
  title: string;
  description: string;
  size: string;
  color: string;
  images: string[];
  pricePerDay: number;
  depositAmount: number;
  insurance: number;
  currentStatus: DressCurrentStatus;
  branchIndex: number;
  /** Position on the branch's popularity curve, 0 = most booked. */
  rank: number;
};

/**
 * Price tiers, calibrated so the portfolio median lands near 800 EGP/day and
 * nothing exceeds 4 000 — the range the atelier's own imported inventory
 * occupies. An earlier draft priced every gown between 1 150 and 4 900, which
 * inflated every revenue figure on the dashboard by roughly five times against
 * the market these demos are shown to.
 */
const DRESS_TIERS = [
  {
    share: 0.1,
    price: [2_500, 4_000],
    colors: ["Ivory", "Pearl", "Champagne", "Blush", "Off-White"],
    fabrics: ["Lace", "Satin", "Tulle", "Silk", "Organza"],
    silhouettes: [
      "Cathedral Wedding Gown",
      "Mermaid Bridal Gown",
      "A-Line Wedding Dress",
      "Ballgown with Chapel Train",
      "Princess Bridal Gown",
    ],
    description: "Bridal gown with a detachable train and corset bodice.",
  },
  {
    share: 0.2,
    price: [1_200, 2_400],
    colors: ["Emerald", "Sapphire", "Burgundy", "Midnight", "Onyx", "Garnet"],
    fabrics: ["Silk", "Satin", "Velvet", "Crepe", "Beaded Tulle"],
    silhouettes: [
      "Evening Gown",
      "Column Gown",
      "Gala Gown",
      "Draped Gown",
      "Off-Shoulder Gown",
    ],
    description: "Floor-length evening gown cut for gala and reception wear.",
  },
  {
    share: 0.3,
    price: [700, 1_200],
    colors: ["Gold", "Blush", "Powder Blue", "Rose", "Lilac", "Sand"],
    fabrics: ["Chiffon", "Embroidered Silk", "Georgette", "Lace", "Brocade"],
    silhouettes: [
      "Engagement Gown",
      "Henna Kaftan",
      "Katb Ketab Dress",
      "Chiffon Gown",
      "Embroidered Gown",
    ],
    description: "Occasion piece for engagement, henna and katb ketab nights.",
  },
  {
    share: 0.4,
    price: [350, 700],
    colors: ["Navy", "Silver", "Coral", "Black", "Rose Gold", "Teal", "Plum"],
    fabrics: ["Velvet", "Satin", "Sequin", "Chiffon", "Crepe"],
    silhouettes: [
      "Cocktail Dress",
      "Midi Dress",
      "Slip Dress",
      "Party Dress",
      "Wrap Dress",
    ],
    description: "Short party dress for engagements and family celebrations.",
  },
] as const;

const DRESS_SIZES = ["XS", "S", "M", "L", "XL"] as const;

/**
 * Twenty portfolio slots carrying each tier in its declared share — two bridal,
 * four evening, six occasion, eight party — then permuted by a coprime stride
 * so the stock list is not sorted by price.
 */
const TIER_PATTERN: readonly number[] = (() => {
  const slots: number[] = [];
  DRESS_TIERS.forEach((tier, index) => {
    for (let n = 0; n < Math.round(tier.share * 20); n += 1) slots.push(index);
  });
  return slots.map((_, position) => slots[(position * 7) % slots.length]);
})();

function roundToStep(value: number, step: number): number {
  return Math.round(value / step) * step;
}

/**
 * Builds a branch's portfolio.
 *
 * `rank` doubles as the popularity ordering: rank 0 is the branch's most-booked
 * dress. Tiers are interleaved across the ranking rather than stacked, so the
 * top of the "most rented" table is a believable mix of a bridal gown and
 * several cheap party dresses instead of the price list in descending order.
 */
function buildBranchDresses(branchIndex: number): DemoDress[] {
  const branch = DEMO_BRANCHES[branchIndex];
  const count = branch.dressCount;

  // Maintenance dresses are spread across the popularity curve, not parked at
  // the unpopular end — a busy dress is exactly the one that ends up at the
  // tailor. `build.ts` keeps any rental covering today off them, or
  // `dressIsOutNow()` would overrule the stored status and empty these buckets.
  const maintenanceStatuses: DressCurrentStatus[] = [
    ...Array<DressCurrentStatus>(branch.maintenance.atTailor).fill("atTailor"),
    ...Array<DressCurrentStatus>(branch.maintenance.atDryCleaner).fill(
      "atDryCleaner",
    ),
    ...Array<DressCurrentStatus>(branch.maintenance.underRepair).fill(
      "underRepair",
    ),
  ];
  const maintenanceStride = Math.max(
    2,
    Math.floor(count / (maintenanceStatuses.length + 1)),
  );
  const statusByRank = new Map<number, DressCurrentStatus>();
  maintenanceStatuses.forEach((status, position) => {
    // Never rank 0-2: those carry the curated bookings that fill the
    // "dresses out" and "upcoming pickup" panels.
    statusByRank.set(3 + position * maintenanceStride, status);
  });

  const usedTitles = new Set<string>();
  const tierCounters = new Map<number, number>();

  return Array.from({ length: count }, (_, rank) => {
    // Tiers are drawn from the share-weighted pattern, NOT round-robin. Cycling
    // the tiers evenly would stock the atelier with 25% bridal gowns and drag
    // the portfolio median from ~800 to ~1200 — every revenue figure on the
    // dashboard inflates with it.
    const tierIndex = TIER_PATTERN[rank % TIER_PATTERN.length];
    const tier = DRESS_TIERS[tierIndex];
    const step = tierCounters.get(tierIndex) ?? 0;
    tierCounters.set(tierIndex, step + 1);

    /**
     * A title is one point in the colour × fabric × silhouette space, addressed
     * by a single index so that incrementing it walks every distinct
     * combination exactly once.
     *
     * Advancing the three axes together instead — the obvious way to write this
     * — only ever reaches the diagonal, which on a tier with equal-length lists
     * is a handful of combinations that the portfolio exhausts almost
     * immediately. The uniqueness loop then spins forever.
     */
    const combinations =
      tier.colors.length * tier.fabrics.length * tier.silhouettes.length;
    const decode = (index: number) => {
      const wrapped = ((index % combinations) + combinations) % combinations;
      return {
        color: tier.colors[wrapped % tier.colors.length],
        fabric:
          tier.fabrics[
            Math.floor(wrapped / tier.colors.length) % tier.fabrics.length
          ],
        silhouette:
          tier.silhouettes[
            Math.floor(wrapped / (tier.colors.length * tier.fabrics.length)) %
              tier.silhouettes.length
          ],
      };
    };

    let picked = decode(step * 7);
    let title = `${picked.color} ${picked.fabric} ${picked.silhouette}`;
    for (
      let attempt = 1;
      usedTitles.has(title) && attempt <= combinations;
      attempt += 1
    ) {
      picked = decode(step * 7 + attempt);
      title = `${picked.color} ${picked.fabric} ${picked.silhouette}`;
    }
    usedTitles.add(title);

    // Spread deterministically across the tier's band rather than clustering on
    // its floor, so the price column reads as a real list.
    const span = tier.price[1] - tier.price[0];
    const pricePerDay = roundToStep(
      tier.price[0] + ((step * 37) % 100) * (span / 100),
      50,
    );

    return {
      id: demoId("dress", `${branchIndex}:${rank}`),
      code: `${branch.shortCode}-D-${String(rank + 1).padStart(3, "0")}`,
      title,
      description: tier.description,
      size: DRESS_SIZES[(rank * 3) % DRESS_SIZES.length],
      color: picked.color,
      pricePerDay,
      images: [
        "https://storage.googleapis.com/megz-courses.appspot.com/uploads%2F1786482586810-8a6b4c62-0d7a-4424-b9f7-1b85fa51746a.avif",
      ],
      depositAmount: roundToStep(pricePerDay * 1.3, 50),
      insurance: roundToStep(pricePerDay * 0.3, 50),
      currentStatus: statusByRank.get(rank) ?? "available",
      branchIndex,
      rank,
    };
  });
}

export const DEMO_DRESSES: readonly DemoDress[] = DEMO_BRANCHES.flatMap(
  (_, branchIndex) => buildBranchDresses(branchIndex),
);

export type DemoCustomer = {
  id: string;
  name: string;
  phone: string;
  note: string | null;
};

/**
 * Brides, so the given name comes from the female half of the shared list while
 * the middle and family names are patronymics — the naming pattern the real
 * customer records follow.
 */
const FEMALE_FIRST_NAMES = FIRST_NAMES.slice(15);
const PATRONYMICS = FIRST_NAMES.slice(0, 15);

/**
 * Phones are `010000` + a five-digit sequence, so uniqueness holds by
 * construction across however many customers the profile generates — both
 * `users.phone` and `rental_customers.phone` are globally unique, and a
 * retry loop would be non-deterministic.
 */
export function buildDemoCustomers(count: number): DemoCustomer[] {
  return Array.from({ length: count }, (_, index) => {
    const n = index + 1;
    const first = FEMALE_FIRST_NAMES[index % FEMALE_FIRST_NAMES.length];
    const middle =
      PATRONYMICS[
        (Math.floor(index / FEMALE_FIRST_NAMES.length) * 7 + index) %
          PATRONYMICS.length
      ];
    const last = LAST_NAMES[(index * 11 + 3) % LAST_NAMES.length];

    return {
      id: demoId("customer", n),
      name: `${first} ${middle} ${last}`,
      phone: `${DEMO_PHONE.prefix}${String(DEMO_PHONE.customerBlock + n).padStart(5, "0")}`,
      note:
        index % 37 === 0
          ? "Prefers a fitting appointment before pickup."
          : index % 53 === 0
            ? "Referred by a previous customer."
            : null,
    };
  });
}

/** Deliberately dull, and free of anything that reads as private. */
export const DEMO_RESERVATION_NOTES: readonly (string | null)[] = [
  null,
  null,
  null,
  null,
  "Hem shortened at the customer's request.",
  "Evening pickup arranged.",
  null,
  "Second fitting completed before pickup.",
  "Steaming booked for the morning of the occasion.",
  null,
  "Veil included with the rental.",
  null,
] as const;

export const DEMO_EXPENSE_DESCRIPTIONS = {
  drycleaning: [
    "Dry cleaning batch — evening gowns",
    "Dry cleaning batch — bridal",
    "Stain treatment, express service",
    "Monthly dry cleaning account",
  ],
  tailoring: [
    "Hem and waist alterations",
    "Bodice re-boning",
    "Sleeve adjustment set",
    "Bridal train repair",
  ],
  dressAcquisition: [
    "New season gown purchase",
    "Replacement gown after retirement",
    "Bridal collection restock",
  ],
  salary: ["Monthly salary run", "Overtime for the wedding season"],
  custom: [
    "Showroom lighting maintenance",
    "Packaging and garment covers",
    "Branch internet subscription",
    "Showroom rent",
  ],
} as const;
