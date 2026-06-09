import { z } from "zod";

import { expenseTypes } from "@/drizzle/schemas/system/expenses-table";

export const expenseListFilterInput = z.object({
  sorting: z.array(z.object({ id: z.string(), desc: z.boolean() })).default([]),
  globalFilter: z.string().optional(),
  columnFilters: z
    .array(z.object({ id: z.string(), value: z.unknown() }))
    .default([]),
  branchId: z.string().uuid().optional(),
});

export const listExpensesInput = z.object({
  page: z.number().int().min(1).default(1),
  perPage: z.number().int().min(1).max(100).default(20),
  sorting: expenseListFilterInput.shape.sorting,
  globalFilter: expenseListFilterInput.shape.globalFilter,
  columnFilters: expenseListFilterInput.shape.columnFilters,
  branchId: expenseListFilterInput.shape.branchId,
});

export const createExpenseInput = z.object({
  branchId: z.string().uuid(),
  type: z.enum(expenseTypes),
  amount: z.number().int().positive(),
  dressId: z.string().uuid().optional(),
  employeeId: z.string().uuid().optional(),
  description: z.string().min(1).max(500),
  note: z.string().max(1000).optional(),
  date: z.string().date(),
});

export const updateExpenseInput = createExpenseInput.extend({
  id: z.string().uuid(),
});

export const deleteExpenseInput = z.object({
  id: z.string().uuid(),
});

export const expenseFormDataInput = z.object({
  branchId: z.string().uuid().optional(),
});

export type ExpenseFormDataInput = z.infer<typeof expenseFormDataInput>;
export type ExpenseListFilterInput = z.infer<typeof expenseListFilterInput>;
export type ListExpensesInput = z.infer<typeof listExpensesInput>;
export type CreateExpenseInput = z.infer<typeof createExpenseInput>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseInput>;
export type DeleteExpenseInput = z.infer<typeof deleteExpenseInput>;
