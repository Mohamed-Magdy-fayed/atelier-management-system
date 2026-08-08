import { relations } from "drizzle-orm";
import { index, pgTable, text, unique, uuid } from "drizzle-orm/pg-core";

import { UsersTable } from "@/drizzle/schemas/auth/users-table";
import { createdAt, id } from "@/drizzle/schemas/helpers";

/**
 * Operational walk-in customers (Option A — not auth users).
 *
 * Customers are tenant-wide, not branch-owned: the same person books at any
 * branch and keeps one history. Branch attribution lives on the reservation.
 *
 * Booking history is derived from `reservations` at read time, never cached on
 * the customer. `reservationsCount`/`lastReservationAt` columns used to live
 * here and silently went stale: only the legacy import ever wrote them, so a
 * customer created in-app showed 0 reservations forever.
 */
export const RentalCustomersTable = pgTable(
  "rental_customers",
  {
    id,
    userId: uuid().references(() => UsersTable.id, { onDelete: "set null" }),
    name: text().notNull(),
    phone: text().notNull(),
    note: text(),
    createdAt,
  },
  (table) => ({
    userIdx: index("rental_customers_user_id_idx").on(table.userId),
    phoneUnique: unique("rental_customers_phone_unique").on(table.phone),
  }),
);

export const rentalCustomersRelations = relations(
  RentalCustomersTable,
  ({ one }) => ({
    user: one(UsersTable, {
      fields: [RentalCustomersTable.userId],
      references: [UsersTable.id],
    }),
  }),
);

export type RentalCustomer = typeof RentalCustomersTable.$inferSelect;
export type NewRentalCustomer = typeof RentalCustomersTable.$inferInsert;
