import { DEMO_PHONE } from "../demo/constants";
import { demoId } from "../demo/ids";

/**
 * The `demo` profile's reserved block, written the way an Egyptian owner types
 * it (`010000…`) rather than country-coded — both forms are valid in the app
 * (see src/lib/phone.ts), and the national one is what reads as real on screen.
 */
const PHONE_PREFIX = `0${DEMO_PHONE.prefix.slice(2)}`;

/**
 * «أتيليه لمسة», the fictional Nasr City atelier behind the marketing
 * screenshots. Everything here is synthetic and publication-safe, on the same
 * rules as the `demo` profile (see docs/seeding-and-demo-data.md): phones sit in
 * the reserved `010000…` block, emails are `@example.com`, and no value is
 * copied from a real customer.
 *
 * Unlike `demo`, names are Arabic: the screenshots are taken in the Arabic UI,
 * and an Arabic owner reading "Mariam Ahmed Hassan" in Latin script on an RTL
 * reservations table would read it as a bug.
 */

export const LAMSA_BRANCH = {
  id: demoId("lamsa-branch", "nasr-city"),
  shortCode: "NSR",
  nameEn: "Lamsa Atelier — Nasr City",
  nameAr: "أتيليه لمسة — مدينة نصر",
  addressEn: "Abbas El-Akkad St., Nasr City, Cairo",
  addressAr: "شارع عباس العقاد، مدينة نصر، القاهرة",
  // Above the `demo` profile's branch numbers, inside the same reserved block.
  phone: `${PHONE_PREFIX}${DEMO_PHONE.branchBlock + 101}`,
  opensAt: "12:00",
  closesAt: "23:00",
} as const;

export const LAMSA_BRAND = {
  nameEn: "Lamsa Atelier",
  nameAr: "أتيليه لمسة",
} as const;

export const LAMSA_ADMIN_NAME = "إدارة أتيليه لمسة";

export type LamsaEmployee = {
  id: string;
  name: string;
  email: string;
  phone: string;
  age: number;
};

export const LAMSA_EMPLOYEES: readonly LamsaEmployee[] = [
  { key: "reception", name: "منة الله سمير", age: 27 },
  { key: "tailor", name: "هبة عبد الرحمن", age: 34 },
].map((employee, index) => ({
  id: demoId("lamsa-employee", employee.key),
  name: employee.name,
  email: `lamsa.${employee.key}@example.com`,
  phone: `${PHONE_PREFIX}${DEMO_PHONE.employeeBlock + 101 + index}`,
  age: employee.age,
}));

export type LamsaDressKind = "bridal" | "engagement" | "soiree" | "katbKetab";

export type LamsaDress = {
  /** 1-based; the code is `NSR-D-<rank>`. */
  rank: number;
  title: string;
  color: string;
  size: string;
  kind: LamsaDressKind;
  pricePerDay: number;
  description: string;
  /** Unsplash photo this dress is shown with, see marketing/credits.md. */
  photo: { unsplashId: string; cdnUrl: string; photographer: string };
};

/**
 * Prices are what the owner charges for one rental (the app's `pricePerDay`,
 * charged flat for a one-or-two-night booking). Bridal sits at the top of the
 * 1 500–8 000 EGP range the brief asked for, evening wear at the bottom.
 */
export const LAMSA_DRESSES: readonly LamsaDress[] = [
  {
    rank: 1,
    title: "فستان زفاف ستان أوف وايت",
    color: "أوف وايت",
    size: "38",
    kind: "bridal",
    pricePerDay: 7500,
    description: "ستان مكسّر بصدر ستراپلس وذيل متوسط.",
    photo: {
      unsplashId: "9Vql-rt09RE",
      cdnUrl: "https://images.unsplash.com/photo-1743090286549-52f6d1983064",
      photographer: "Eko Arfin",
    },
  },
  {
    rank: 2,
    title: "فستان زفاف دانتيل كلاسيك",
    color: "أبيض",
    size: "40",
    kind: "bridal",
    pricePerDay: 6500,
    description: "دانتيل فرنساوي على الصدر وجيبة طويلة.",
    photo: {
      unsplashId: "CjLUsmyPc1Y",
      cdnUrl: "https://images.unsplash.com/photo-1791483829787-8abad9c229c0",
      photographer: "Alina Belous",
    },
  },
  {
    rank: 3,
    title: "فستان زفاف ميرميد دانتيل",
    color: "عاجي",
    size: "36",
    kind: "bridal",
    pricePerDay: 8000,
    description: "قصة ميرميد بدانتيل كامل وذيل طويل.",
    photo: {
      unsplashId: "tTn-X7huVbI",
      cdnUrl: "https://images.unsplash.com/photo-1774009501393-bac5a0a11afc",
      photographer: "Sou Jest",
    },
  },
  {
    rank: 4,
    title: "فستان زفاف سويت هارت",
    color: "أبيض",
    size: "42",
    kind: "bridal",
    pricePerDay: 5500,
    description: "صدر سويت هارت وحزام ساتان.",
    photo: {
      unsplashId: "pHA6KL_HpoE",
      cdnUrl: "https://images.unsplash.com/photo-1540459920617-415d62f1f76b",
      photographer: "Alessandra Caretto",
    },
  },
  {
    rank: 5,
    title: "فستان زفاف برنسيس منفوش",
    color: "أوف وايت",
    size: "40",
    kind: "bridal",
    pricePerDay: 6000,
    description: "جيبة منفوشة بطبقات تول ودانتيل على الصدر.",
    photo: {
      unsplashId: "lUyAqyCaHuY",
      cdnUrl: "https://images.unsplash.com/photo-1705356589956-2ef2008975fc",
      photographer: "AÉNL Weddings",
    },
  },
  {
    rank: 6,
    title: "فستان زفاف دانتيل بأكمام",
    color: "أبيض",
    size: "44",
    kind: "bridal",
    pricePerDay: 7000,
    description: "أكمام دانتيل طويلة مناسبة للمحجبات.",
    photo: {
      unsplashId: "VDYvQoUKuQc",
      cdnUrl: "https://images.unsplash.com/photo-1627917942684-111cb9d75705",
      photographer: "Will Roberts",
    },
  },
  {
    rank: 7,
    title: "فستان كتب كتاب سادة",
    color: "أبيض",
    size: "38",
    kind: "katbKetab",
    pricePerDay: 2500,
    description: "قصة بسيطة بحمالات، خفيف ومريح.",
    photo: {
      unsplashId: "I7OVCI5qeOU",
      cdnUrl: "https://images.unsplash.com/photo-1707193392686-a655bb1a47e3",
      photographer: "550Park Luxury Wedding Films",
    },
  },
  {
    rank: 8,
    title: "فستان خطوبة شامبين مطرز",
    color: "شامبين",
    size: "40",
    kind: "engagement",
    pricePerDay: 4000,
    description: "تطريز خرز يدوي على تول شامبين.",
    photo: {
      unsplashId: "c2GcluQzikk",
      cdnUrl: "https://images.unsplash.com/photo-1750178943276-070eb3e6e5da",
      photographer: "Alexander Mass",
    },
  },
  {
    rank: 9,
    title: "فستان خطوبة ورود بينك",
    color: "بينك فاتح",
    size: "36",
    kind: "engagement",
    pricePerDay: 3500,
    description: "ورود ثلاثية الأبعاد على تول لبني وبينك.",
    photo: {
      unsplashId: "jt26Oklpubw",
      cdnUrl: "https://images.unsplash.com/photo-1594179056536-dc8714fc8fdf",
      photographer: "莎莉 彭",
    },
  },
  {
    rank: 10,
    title: "فستان سواريه ذهبي ترتر",
    color: "ذهبي",
    size: "فري سايز",
    kind: "soiree",
    pricePerDay: 3000,
    description: "ترتر وتطريز ذهبي بأكمام.",
    photo: {
      unsplashId: "KJN6tzCht2I",
      cdnUrl: "https://images.unsplash.com/photo-1768885560804-637950eb129d",
      photographer: "zai Dan",
    },
  },
  {
    rank: 11,
    title: "فستان سواريه أحمر تول",
    color: "أحمر",
    size: "38",
    kind: "soiree",
    pricePerDay: 2000,
    description: "تول منفوش بصدر ستراپلس.",
    photo: {
      unsplashId: "M6gL5WhhY3w",
      cdnUrl: "https://images.unsplash.com/photo-1783822083911-4b9fa32f6485",
      photographer: "Candy van Rood",
    },
  },
  {
    rank: 12,
    title: "فستان سواريه أسود مطرز",
    color: "أسود",
    size: "42",
    kind: "soiree",
    pricePerDay: 2200,
    description: "صدر مطرز بالخرز وجيبة ساتان.",
    photo: {
      unsplashId: "8n23OA_cDdA",
      cdnUrl: "https://images.unsplash.com/photo-1735941724129-5f61f472d5b8",
      photographer: "Ksenia Obukhova",
    },
  },
  {
    rank: 13,
    title: "فستان سواريه أبيض بنقوش زرقاء",
    color: "أبيض وأزرق",
    size: "36",
    kind: "soiree",
    pricePerDay: 1500,
    description: "شيفون منقوش بقصة غير متماثلة.",
    photo: {
      unsplashId: "5w9HLYbS2oQ",
      cdnUrl: "https://images.unsplash.com/photo-1787841258359-066291bbee07",
      photographer: "Sou Jest",
    },
  },
];

export function lamsaDressCode(rank: number): string {
  return `${LAMSA_BRANCH.shortCode}-D-${String(rank).padStart(3, "0")}`;
}

/** Served by Next.js from `public/`, so no image ever reaches Firebase. */
export function lamsaDressImagePath(rank: number): string {
  return `/marketing/dresses/${lamsaDressCode(rank)}.jpg`;
}

const FIRST_NAMES = [
  "مريم",
  "سلمى",
  "نور",
  "ياسمين",
  "هدى",
  "رنا",
  "ملك",
  "جنى",
  "فرح",
  "دينا",
  "آية",
  "شهد",
  "روان",
  "سارة",
  "لمياء",
  "نادين",
  "حبيبة",
  "إسراء",
  "منى",
  "ريم",
];

const FATHER_NAMES = [
  "أحمد",
  "محمد",
  "محمود",
  "خالد",
  "طارق",
  "عمرو",
  "حسام",
  "وليد",
  "إبراهيم",
  "مصطفى",
  "شريف",
  "هشام",
];

const FAMILY_NAMES = [
  "عبد الله",
  "السيد",
  "حسن",
  "فؤاد",
  "الشناوي",
  "منصور",
  "رضوان",
  "الجمال",
  "عثمان",
  "سليمان",
  "زكي",
  "النجار",
  "شاكر",
];

export type LamsaCustomer = {
  id: string;
  name: string;
  phone: string;
};

/**
 * Deterministic and collision-free: the name walks three co-prime lists, and the
 * phone is an ordinal in the `demo` profile's reserved customer block, offset
 * past anything that profile could ever generate.
 */
export function buildLamsaCustomers(count: number): LamsaCustomer[] {
  return Array.from({ length: count }, (_, index) => {
    const n = index + 1;
    const first = FIRST_NAMES[index % FIRST_NAMES.length];
    const father = FATHER_NAMES[(index * 7 + 3) % FATHER_NAMES.length];
    const family = FAMILY_NAMES[(index * 5 + 1) % FAMILY_NAMES.length];
    return {
      id: demoId("lamsa-customer", n),
      name: `${first} ${father} ${family}`,
      phone: `${PHONE_PREFIX}${String(DEMO_PHONE.customerBlock + 50_000 + n).padStart(5, "0")}`,
    };
  });
}

export const LAMSA_RESERVATION_NOTES: readonly (string | null)[] = [
  null,
  null,
  "تقصير الطول حسب طلب العروسة.",
  null,
  "الاستلام بعد الساعة ٨ مساءً.",
  null,
  "مع الطرحة.",
  null,
  "كيّ بالبخار صباح يوم المناسبة.",
  null,
];

export const LAMSA_EXPENSES = [
  { type: "salary", amount: 9000, description: "مرتبات الشهر" },
  { type: "custom", amount: 12000, description: "إيجار المحل" },
  {
    type: "drycleaning",
    amount: 1800,
    description: "تنظيف جاف — فساتين سواريه",
  },
  { type: "tailoring", amount: 1200, description: "تعديلات مقاسات" },
] as const;
