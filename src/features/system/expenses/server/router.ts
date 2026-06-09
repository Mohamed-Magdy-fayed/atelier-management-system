import { createTRPCRouter, protectedProcedure } from "@/integrations/trpc/init";

import { createExpense, deleteExpense, updateExpense } from "./mutations";
import { exportExpenses, getExpenseFormData, listExpenses } from "./queries";
import {
  createExpenseInput,
  deleteExpenseInput,
  expenseFormDataInput,
  expenseListFilterInput,
  listExpensesInput,
  updateExpenseInput,
} from "./schemas";

export const expensesRouter = createTRPCRouter({
  list: protectedProcedure
    .input(listExpensesInput)
    .query(async ({ ctx, input }) => listExpenses(ctx, input)),

  exportRows: protectedProcedure
    .input(expenseListFilterInput)
    .query(async ({ ctx, input }) => exportExpenses(ctx, input)),

  formData: protectedProcedure
    .input(expenseFormDataInput)
    .query(async ({ ctx, input }) => getExpenseFormData(ctx, input)),

  create: protectedProcedure
    .input(createExpenseInput)
    .mutation(async ({ ctx, input }) => createExpense(ctx, input)),

  update: protectedProcedure
    .input(updateExpenseInput)
    .mutation(async ({ ctx, input }) => updateExpense(ctx, input)),

  delete: protectedProcedure
    .input(deleteExpenseInput)
    .mutation(async ({ ctx, input }) => deleteExpense(ctx, input)),
});
