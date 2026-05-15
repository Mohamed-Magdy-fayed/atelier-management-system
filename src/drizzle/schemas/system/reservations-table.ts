import { relations } from "drizzle-orm";
import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { BranchesTable } from "@/drizzle/schemas/auth/branches-table";
import { DressesTable } from "@/drizzle/schemas/system/dresses-table";
import { PaymentsTable } from "@/drizzle/schemas/system/payments-table";
import { RentalCustomersTable } from "@/drizzle/schemas/system/rental-customers-table";
import {
  createdAt,
  createdBy,
  deletedAt,
  deletedBy,
  id,
  updatedAt,
  updatedBy,
} from "@/drizzle/schemas/helpers";

export const reservationStatuses = [
  "reserved",
  "pickedUp",
  "returned",
  "cancelled",
] as const;
export const reservationStatusEnum = pgEnum(
  "reservation_status",
  reservationStatuses,
);
export type ReservationStatus = (typeof reservationStatuses)[number];

export const ReservationsTable = pgTable(
  "reservations",
  {
    id,
    branchId: uuid()
      .notNull()
      .references(() => BranchesTable.id, { onDelete: "cascade" }),
    dressId: uuid()
      .notNull()
      .references(() => DressesTable.id, { onDelete: "cascade" }),
    customerId: uuid()
      .notNull()
      .references(() => RentalCustomersTable.id, { onDelete: "cascade" }),
    reservationCode: varchar({ length: 128 }).notNull().unique(),
    customerName: varchar({ length: 255 }).notNull(),
    customerPhone: varchar({ length: 32 }),
    receivingDateTime: timestamp({ withTimezone: true }).notNull(),
    occasionDate: timestamp({ withTimezone: true }).notNull(),
    returnDateTime: timestamp({ withTimezone: true }).notNull(),
    totalPrice: integer().notNull(),
    insurance: integer().notNull().default(0),
    discount: integer().notNull().default(0),
    depositPaid: integer().notNull().default(0),
    totalPaid: integer().notNull().default(0),
    status: reservationStatusEnum().notNull().default("reserved"),
    notes: text(),
    createdBy,
    createdAt,
    updatedBy,
    updatedAt,
    deletedBy,
    deletedAt,
  },
  (table) => ({
    branchIdx: index("reservations_branch_id_idx").on(table.branchId),
    statusIdx: index("reservations_status_idx").on(table.status),
    dressIdx: index("reservations_dress_id_idx").on(table.dressId),
    customerIdx: index("reservations_customer_id_idx").on(table.customerId),
    reservationCodeIdx: index("reservations_code_idx").on(
      table.reservationCode,
    ),
  }),
);

export const reservationsRelations = relations(
  ReservationsTable,
  ({ one, many }) => ({
    branch: one(BranchesTable, {
      fields: [ReservationsTable.branchId],
      references: [BranchesTable.id],
    }),
    dress: one(DressesTable, {
      fields: [ReservationsTable.dressId],
      references: [DressesTable.id],
    }),
    customer: one(RentalCustomersTable, {
      fields: [ReservationsTable.customerId],
      references: [RentalCustomersTable.id],
    }),
    payments: many(PaymentsTable),
  }),
);

export type Reservation = typeof ReservationsTable.$inferSelect;
export type NewReservation = typeof ReservationsTable.$inferInsert;
