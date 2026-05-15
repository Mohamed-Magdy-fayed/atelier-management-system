import { eq, or, sql } from "drizzle-orm";

import { db } from "@/drizzle";
import { RentalCustomersTable, UsersTable } from "@/drizzle/schema";
import { normalizePhoneKey } from "@/lib/phone";

/** Associates walk-in rental customer rows with the signed-in account (by userId + phone). */
export async function linkRentalCustomersToUser(userId: string) {
  const user = await db.query.UsersTable.findFirst({
    columns: { phone: true },
    where: eq(UsersTable.id, userId),
  });

  const phoneKey = normalizePhoneKey(user?.phone);
  if (!phoneKey) return;

  try {
    await db
      .update(RentalCustomersTable)
      .set({ userId })
      .where(
        or(
          eq(RentalCustomersTable.userId, userId),
          sql`regexp_replace(${RentalCustomersTable.phone}, '\\D', '', 'g') LIKE ${`%${phoneKey}`}`,
        ),
      );
  } catch {
    // `rental_customers.userId` requires migration 0005_rental_customers_user_id
  }
}
