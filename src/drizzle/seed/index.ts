import { seedBase } from "@/drizzle/seed/base";
import { clearDb } from "@/drizzle/seed/clear-db";

export const SEED_ACTOR_EMAIL = "root@mail.com";

export async function seedAll() {
    await clearDb();
    const result = await seedBase();
    console.info(
        `Seed summary: ${result.seededCustomerCount} customers, ${result.seededEmployees.length} employees.`,
    );
}
