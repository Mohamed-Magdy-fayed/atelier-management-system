import { relations } from "drizzle-orm";
import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { BranchesTable } from "@/drizzle/schemas/auth/branches-table";
import { UsersTable } from "@/drizzle/schemas/auth/users-table";
import { createdAt, id } from "@/drizzle/schemas/helpers";

/** Operational walk-in customers (Option A — not auth users). */
export const RentalCustomersTable = pgTable(
  "rental_customers",
  {
    id,
    branchId: uuid()
      .notNull()
      .references(() => BranchesTable.id, { onDelete: "cascade" }),
    userId: uuid().references(() => UsersTable.id, { onDelete: "set null" }),
    name: text().notNull(),
    phone: text().notNull(),
    reservationsCount: integer().notNull().default(0),
    note: text(),
    lastReservationAt: timestamp({ withTimezone: true }),
    createdAt,
  },
  (table) => ({
    branchIdx: index("rental_customers_branch_id_idx").on(table.branchId),
    userIdx: index("rental_customers_user_id_idx").on(table.userId),
    branchPhoneUnique: unique("rental_customers_branch_phone_unique").on(
      table.branchId,
      table.phone,
    ),
  }),
);

export const rentalCustomersRelations = relations(
  RentalCustomersTable,
  ({ one }) => ({
    branch: one(BranchesTable, {
      fields: [RentalCustomersTable.branchId],
      references: [BranchesTable.id],
    }),
    user: one(UsersTable, {
      fields: [RentalCustomersTable.userId],
      references: [UsersTable.id],
    }),
  }),
);

export type RentalCustomer = typeof RentalCustomersTable.$inferSelect;
export type NewRentalCustomer = typeof RentalCustomersTable.$inferInsert;
