import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { BranchesTable } from "@/drizzle/schemas/auth/branches-table";
import {
  createdAt,
  createdBy,
  deletedAt,
  deletedBy,
  id,
  updatedAt,
  updatedBy,
} from "@/drizzle/schemas/helpers";

export const dressCurrentStatusValues = [
  "available",
  "atTailor",
  "atDryCleaner",
  "underRepair",
] as const;
export type DressCurrentStatus = (typeof dressCurrentStatusValues)[number];
export const dressCurrentStatusEnum = pgEnum(
  "dress_current_status",
  dressCurrentStatusValues,
);

export const DressesTable = pgTable(
  "dresses",
  {
    id,
    branchId: uuid()
      .notNull()
      .references(() => BranchesTable.id, { onDelete: "cascade" }),
    code: varchar({ length: 128 }).notNull().unique(),
    title: varchar({ length: 255 }).notNull(),
    description: text(),
    images: text().array(),
    size: varchar({ length: 64 }),
    color: varchar({ length: 64 }),
    pricePerDay: integer().notNull(),
    depositAmount: integer().notNull(),
    insurance: integer().notNull(),
    timesRented: integer().notNull().default(0),
    isActive: boolean().notNull().default(true),
    currentStatus: dressCurrentStatusEnum().notNull().default("available"),
    createdBy,
    createdAt,
    updatedBy,
    updatedAt,
    deletedBy,
    deletedAt,
  },
  (table) => ({
    branchIdx: index("dresses_branch_id_idx").on(table.branchId),
  }),
);

export const dressesRelations = relations(DressesTable, ({ one }) => ({
  branch: one(BranchesTable, {
    fields: [DressesTable.branchId],
    references: [BranchesTable.id],
  }),
}));

export type Dress = typeof DressesTable.$inferSelect;
export type NewDress = typeof DressesTable.$inferInsert;
