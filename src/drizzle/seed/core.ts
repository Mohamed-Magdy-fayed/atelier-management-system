import { db } from "@/drizzle";
import {
  BranchesTable,
  BranchMembershipsTable,
  UserCredentialsTable,
  UsersTable,
} from "@/drizzle/schema";
import { hashPassword } from "@/features/core/auth/core/passwordHasher";

import {
  SEED_ADMIN_EMAIL,
  SEED_ADMIN_ID,
  SEED_ADMIN_PASSWORD,
  SEED_SYSTEM_ACTOR,
  type SeedProfileName,
} from "./constants";

const DAY_MS = 24 * 60 * 60 * 1_000;

const FIRST_NAMES = [
  "Ahmed",
  "Mohamed",
  "Mahmoud",
  "Mostafa",
  "Khaled",
  "Hassan",
  "Hussein",
  "Youssef",
  "Omar",
  "Amr",
  "Ali",
  "Ibrahim",
  "Tarek",
  "Sherif",
  "Hossam",
  "Sara",
  "Mariam",
  "Nour",
  "Salma",
  "Hana",
  "Yasmine",
  "Aya",
  "Dina",
  "Reem",
  "Heba",
  "Laila",
  "Fatma",
  "Eman",
  "Rasha",
  "Mona",
] as const;

const LAST_NAMES = [
  "Hassan",
  "Saleh",
  "Mostafa",
  "Ibrahim",
  "Adel",
  "Fathy",
  "Gamal",
  "Said",
  "Mansour",
  "Nabil",
  "Farouk",
  "Younis",
  "Sabry",
  "Hamdy",
  "Helmy",
  "Ezzat",
  "Shawky",
  "Magdy",
  "Refaat",
  "Anwar",
  "Hashem",
  "Khalifa",
] as const;

const branchesData: (typeof BranchesTable.$inferInsert)[] = [
  { nameAr: "الفرع الرئيسي", nameEn: "Main Branch" },
  { nameAr: "القاهرة", nameEn: "Cairo" },
  { nameAr: "الإسكندرية", nameEn: "Alexandria" },
  { nameAr: "الجيزة", nameEn: "Giza" },
  { nameAr: "طنطا", nameEn: "Tanta" },
  { nameAr: "المنصورة", nameEn: "Mansoura" },
  { nameAr: "أسيوط", nameEn: "Assiut" },
] as const;

export type SeedScenarioConfig = {
  customerCount: number;
  customerInsertBatch: number;
  employeeCount: number;
  profile: SeedProfileName;
};

export type SeedScenarioResult = {
  adminCredential: typeof UserCredentialsTable.$inferSelect;
  adminUser: typeof UsersTable.$inferSelect;
  basicBranches: Array<typeof BranchesTable.$inferSelect>;
  branchAssignments: unknown;
  profile: SeedProfileName;
  seededCustomerCount: number;
  seededEmployees: Array<{ id: string }>;
};

function pickName(i: number): string {
  const first = FIRST_NAMES[i % FIRST_NAMES.length];
  const last = LAST_NAMES[(i * 7) % LAST_NAMES.length];
  return `${first} ${last}`;
}

function pickAge(i: number): number | null {
  if (i % 11 === 0) return null;
  return 5 + ((i * 13) % 86);
}

function pickPhone(i: number, idx: number): string | null {
  if (i % 13 === 0) return null;
  const formatter = i % 5;
  const seq = `${1_000_000 + idx}`;
  if (formatter === 0) return `201${seq}`;
  if (formatter === 1) return `0020${seq}`;
  if (formatter === 2) return `1${seq}`;
  if (formatter === 3) return `9665${seq.slice(0, 8)}`;
  return `010${seq}`;
}

function pickCreatedAt(i: number, now: number): Date {
  const daysBack = (i * 17) % (3 * 365);
  return new Date(now - daysBack * DAY_MS);
}

function pickLastSignInAt(i: number, now: number, createdAt: Date): Date | null {
  if (i % 4 === 0) return null;
  const span = Math.max(1, Math.floor((now - createdAt.getTime()) / DAY_MS));
  const daysAgo = (i * 23) % Math.min(span, 540);
  return new Date(now - daysAgo * DAY_MS);
}

function pickEmailVerifiedAt(
  i: number,
  createdAt: Date,
  rate: number,
): Date | null {
  if ((i * 7) % 100 >= rate) return null;
  const within = ((i * 5) % 30) + 1;
  return new Date(createdAt.getTime() + within * DAY_MS);
}

function buildSeedEmployees(
  createdBy: string,
  count: number,
): Array<typeof UsersTable.$inferInsert> {
  const now = Date.now();
  return Array.from({ length: count }, (_, index) => {
    const i = index + 1;
    const createdAt = pickCreatedAt(i + 1_000_000, now);
    return {
      createdBy,
      email: `employee${i}@mail.com`,
      name: pickName(i + 5),
      phone: `+2010${String(10_000_000 + i).padStart(8, "0")}`,
      role: "employee" as const,
      age: pickAge(i + 1),
      createdAt,
      lastSignInAt: pickLastSignInAt(i + 3, now, createdAt),
      emailVerifiedAt: pickEmailVerifiedAt(i, createdAt, 85),
    };
  });
}

function buildSeedCustomers(
  createdBy: string,
  offset: number,
  length: number,
): Array<typeof UsersTable.$inferInsert> {
  const now = Date.now();
  return Array.from({ length }, (_, j) => {
    const i = offset + j;
    const n = i + 1;
    const createdAt = pickCreatedAt(i, now);
    return {
      createdBy,
      email: `customer.seed.${n}@example.com`,
      name: pickName(i),
      phone: pickPhone(i, n),
      role: "customer" as const,
      age: pickAge(i),
      createdAt,
      emailVerifiedAt: pickEmailVerifiedAt(i, createdAt, 60),
      lastSignInAt: pickLastSignInAt(i, now, createdAt),
    };
  });
}

export async function seedScenario(
  config: SeedScenarioConfig,
): Promise<SeedScenarioResult> {
  const {
    adminUser,
    adminCredential,
    basicBranches,
    branchAssignments,
    seededEmployees,
    seededCustomerCount,
  } = await db.transaction(async (tx) => {
    const adminUser = await tx
      .insert(UsersTable)
      .values({
        id: SEED_ADMIN_ID,
        createdBy: SEED_SYSTEM_ACTOR,
        email: SEED_ADMIN_EMAIL,
        emailVerifiedAt: new Date(),
        phone: "20123456789",
        name: "System Administrator",
        role: "admin",
      })
      .returning()
      .then((data) => data[0]);

    const passwordHash = await hashPassword(SEED_ADMIN_PASSWORD, adminUser.id);

    const adminCredential = await tx
      .insert(UserCredentialsTable)
      .values({
        userId: adminUser.id,
        passwordHash,
        passwordSalt: adminUser.id,
      })
      .returning()
      .then((data) => data[0]);

    const basicBranches = await tx
      .insert(BranchesTable)
      .values(branchesData)
      .returning();

    const branchAssignments = await tx.insert(BranchMembershipsTable).values(
      basicBranches.map((branch, index) => ({
        userId: adminUser.id,
        branchId: branch.id,
        isCurrent: index === 0,
      })),
    );

    const employees = buildSeedEmployees(SEED_SYSTEM_ACTOR, config.employeeCount);
    const seededEmployees = await tx
      .insert(UsersTable)
      .values(employees)
      .returning({ id: UsersTable.id });

    const employeeBranches = basicBranches.slice(1);
    const employeeMemberships = seededEmployees.flatMap((employee, index) => {
      if (index % 5 === 0) return [];

      const availableBranches =
        employeeBranches.length > 0 ? employeeBranches : basicBranches;
      const primaryBranch =
        availableBranches[index % availableBranches.length]?.id;
      const secondaryBranch =
        availableBranches[(index + 1) % availableBranches.length]?.id;

      if (!primaryBranch) return [];

      const assignments: Array<typeof BranchMembershipsTable.$inferInsert> = [
        {
          userId: employee.id,
          branchId: primaryBranch,
          isCurrent: true,
        },
      ];

      if (secondaryBranch && index % 3 === 0) {
        assignments.push({
          userId: employee.id,
          branchId: secondaryBranch,
          isCurrent: false,
        });
      }

      return assignments;
    });

    if (employeeMemberships.length) {
      await tx.insert(BranchMembershipsTable).values(employeeMemberships);
    }

    let seededCustomerCount = 0;
    for (
      let offset = 0;
      offset < config.customerCount;
      offset += config.customerInsertBatch
    ) {
      const batchSize = Math.min(
        config.customerInsertBatch,
        config.customerCount - offset,
      );
      const batch = buildSeedCustomers(SEED_SYSTEM_ACTOR, offset, batchSize);
      await tx.insert(UsersTable).values(batch);
      seededCustomerCount += batch.length;
    }

    return {
      adminUser,
      adminCredential,
      basicBranches,
      branchAssignments,
      seededEmployees,
      seededCustomerCount,
    };
  });

  return {
    profile: config.profile,
    adminUser,
    adminCredential,
    basicBranches,
    branchAssignments,
    seededEmployees,
    seededCustomerCount,
  };
}
