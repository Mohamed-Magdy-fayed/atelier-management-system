import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  time,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "@/drizzle/schemas/helpers";
import { BranchMembershipsTable, UsersTable } from ".";

export const BranchesTable = pgTable(
  "branches",
  {
    id,
    shortCode: varchar({ length: 8 }).notNull(),
    nameEn: varchar({ length: 128 }).notNull(),
    nameAr: varchar({ length: 128 }).notNull(),
    addressEn: text(),
    addressAr: text(),
    phone: varchar({ length: 32 }),
    opensAt: time(),
    closesAt: time(),
    mapUrl: varchar({ length: 2048 }),
    ownerId: uuid().references(() => UsersTable.id, { onDelete: "set null" }),
    createdAt,
    updatedAt,
  },
  (table) => [uniqueIndex("branches_short_code_idx").on(table.shortCode)],
);

export const branchesRelations = relations(BranchesTable, ({ many, one }) => ({
  memberships: many(BranchMembershipsTable),
  owner: one(UsersTable, {
    fields: [BranchesTable.ownerId],
    references: [UsersTable.id],
  }),
}));

export type Branch = typeof BranchesTable.$inferSelect;
export type NewBranch = typeof BranchesTable.$inferInsert;
