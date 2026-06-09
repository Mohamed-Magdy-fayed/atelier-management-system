import { relations } from "drizzle-orm";
import { date, integer, pgEnum, pgTable, text, uuid } from "drizzle-orm/pg-core";

import { BranchesTable } from "@/drizzle/schemas/auth/branches-table";
import { UsersTable } from "@/drizzle/schemas/auth/users-table";
import { createdAt, createdBy, id, updatedAt, updatedBy } from "@/drizzle/schemas/helpers";
import { DressesTable } from "@/drizzle/schemas/system/dresses-table";

export const expenseTypes = [
  "drycleaning",
  "tailoring",
  "dressAcquisition",
  "salary",
  "custom",
] as const;
export const expenseTypeEnum = pgEnum("expense_type", expenseTypes);
export type ExpenseType = (typeof expenseTypes)[number];

export const ExpensesTable = pgTable("expenses", {
  id,
  branchId: uuid()
    .notNull()
    .references(() => BranchesTable.id, { onDelete: "cascade" }),
  type: expenseTypeEnum().notNull(),
  amount: integer().notNull(),
  dressId: uuid().references(() => DressesTable.id, { onDelete: "set null" }),
  employeeId: uuid().references(() => UsersTable.id, { onDelete: "set null" }),
  description: text().notNull(),
  note: text(),
  date: date().notNull(),
  createdBy,
  createdAt,
  updatedBy,
  updatedAt,
});

export const expensesRelations = relations(ExpensesTable, ({ one }) => ({
  branch: one(BranchesTable, {
    fields: [ExpensesTable.branchId],
    references: [BranchesTable.id],
  }),
  dress: one(DressesTable, {
    fields: [ExpensesTable.dressId],
    references: [DressesTable.id],
  }),
  employee: one(UsersTable, {
    fields: [ExpensesTable.employeeId],
    references: [UsersTable.id],
  }),
}));

export type Expense = typeof ExpensesTable.$inferSelect;
export type NewExpense = typeof ExpensesTable.$inferInsert;
