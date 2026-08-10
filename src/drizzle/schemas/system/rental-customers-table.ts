import { relations } from "drizzle-orm";
import {
  index,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { UsersTable } from "@/drizzle/schemas/auth/users-table";
import { createdAt, id } from "@/drizzle/schemas/helpers";

/**
 * Operational walk-in customers (Option A — not auth users).
 *
 * Customers are tenant-wide, not branch-owned: the same person books at any
 * branch and keeps one history. Branch attribution lives on the reservation.
 *
 * `reservationsCount` stays derived at read time: the customer list scopes it to
 * the active branch, and a stored counter can only ever hold the tenant-wide
 * total.
 *
 * `lastReservationAt` is cached because it is branch-agnostic, and is maintained
 * by `refreshReservationStats` (src/features/system/shared/reservation-stats.ts)
 * on every reservation write. It is recomputed from `reservations`, never
 * incrementally patched — the earlier version of this column was written only by
 * the legacy import and silently went stale the moment a booking was made
 * in-app.
 */
export const RentalCustomersTable = pgTable(
  "rental_customers",
  {
    id,
    userId: uuid().references(() => UsersTable.id, { onDelete: "set null" }),
    name: text().notNull(),
    phone: text().notNull(),
    note: text(),
    lastReservationAt: timestamp({ withTimezone: true }),
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
