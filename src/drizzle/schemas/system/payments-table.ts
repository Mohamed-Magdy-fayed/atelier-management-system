import { relations } from "drizzle-orm";
import {
  integer,
  pgEnum,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core";

import { BranchesTable } from "@/drizzle/schemas/auth/branches-table";
import { RentalCustomersTable } from "@/drizzle/schemas/system/rental-customers-table";
import { ReservationsTable } from "@/drizzle/schemas/system/reservations-table";
import { createdAt, createdBy, id } from "@/drizzle/schemas/helpers";

export const paymentTypes = [
  "deposit",
  "finalPayment",
  "penalty",
  "insurance",
] as const;
export const paymentTypeEnum = pgEnum("payment_type", paymentTypes);
export type PaymentType = (typeof paymentTypes)[number];

export const paymentMethods = [
  "instapay",
  "mobileWallet",
  "visa",
  "cash",
] as const;
export const paymentMethodEnum = pgEnum("payment_method", paymentMethods);
export type PaymentMethod = (typeof paymentMethods)[number];

export const PaymentsTable = pgTable("payments", {
  id,
  branchId: uuid()
    .notNull()
    .references(() => BranchesTable.id, { onDelete: "cascade" }),
  reservationId: uuid()
    .notNull()
    .references(() => ReservationsTable.id, { onDelete: "cascade" }),
  customerId: uuid()
    .notNull()
    .references(() => RentalCustomersTable.id, { onDelete: "cascade" }),
  amount: integer().notNull(),
  type: paymentTypeEnum().notNull(),
  method: paymentMethodEnum().notNull(),
  note: text(),
  createdBy,
  createdAt,
});

export const paymentsRelations = relations(PaymentsTable, ({ one }) => ({
  branch: one(BranchesTable, {
    fields: [PaymentsTable.branchId],
    references: [BranchesTable.id],
  }),
  reservation: one(ReservationsTable, {
    fields: [PaymentsTable.reservationId],
    references: [ReservationsTable.id],
  }),
  customer: one(RentalCustomersTable, {
    fields: [PaymentsTable.customerId],
    references: [RentalCustomersTable.id],
  }),
}));

export type Payment = typeof PaymentsTable.$inferSelect;
export type NewPayment = typeof PaymentsTable.$inferInsert;
