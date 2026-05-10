import { db } from "@/drizzle";
import {
    BranchesTable,
    BranchMembershipsTable,
    UserCredentialsTable,
    UsersTable,
} from "@/drizzle/schema";
import { SEED_ACTOR_EMAIL } from "@/drizzle/seed";
import { hashPassword } from "@/features/core/auth/core";

const adminId = "00000000-0000-0000-0000-000000000001";

export async function seedBase() {
    const {
        adminUser,
        adminCredential,
        basicBranches,
        branchAssignments,
        seededEmployees,
    } =
        await db.transaction(async (tx) => {
            const adminUser = await tx
                .insert(UsersTable)
                .values({
                    id: adminId,
                    createdBy: SEED_ACTOR_EMAIL,
                    email: SEED_ACTOR_EMAIL,
                    emailVerifiedAt: new Date(),
                    phone: "20123456789",
                    imageUrl: "https://github.com/shadcn.png",
                    name: "Root Admin",
                    role: "admin",
                })
                .returning()
                .then((data) => data[0]);

            const passwordHash = await hashPassword("Make.1234", adminUser.id);

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
                basicBranches.map((branch) => ({
                    userId: adminUser.id,
                    branchId: branch.id,
                })),
            );

            const employees = buildSeedEmployees(adminUser.email ?? SEED_ACTOR_EMAIL);
            const seededEmployees = await tx
                .insert(UsersTable)
                .values(employees)
                .returning({ id: UsersTable.id });

            const employeeMemberships = seededEmployees.flatMap((employee, index) => {
                const primaryBranch = basicBranches[index % basicBranches.length]?.id;
                const secondaryBranch = basicBranches[(index + 1) % basicBranches.length]?.id;

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

            return {
                adminUser,
                adminCredential,
                basicBranches,
                branchAssignments,
                seededEmployees,
            };
        });

    return {
        adminUser,
        adminCredential,
        basicBranches,
        branchAssignments,
        seededEmployees,
    };
}

function buildSeedEmployees(createdBy: string): Array<typeof UsersTable.$inferInsert> {
    return Array.from({ length: 60 }, (_, index) => {
        const i = index + 1;

        return {
            createdBy,
            email: `employee${i}@mail.com`,
            name: `Employee ${i}`,
            phone: `2012000${String(i).padStart(4, "0")}`,
            role: "employee",
            salary: 5000 + (i % 12) * 750,
            lastSignInAt: new Date(Date.now() - i * 36e5),
            emailVerifiedAt: new Date(),
            phoneVerifiedAt: new Date(),
        };
    });
}

const branchesData: (typeof BranchesTable.$inferInsert)[] = [
    { nameAr: "القاهرة", nameEn: "Cairo" },
    { nameAr: "الإسكندرية", nameEn: "Alexandria" },
    { nameAr: "الجيزة", nameEn: "Giza" },
    { nameAr: "طنطا", nameEn: "Tanta" },
    { nameAr: "المنصورة", nameEn: "Mansoura" },
    { nameAr: "أسيوط", nameEn: "Assiut" },
];
