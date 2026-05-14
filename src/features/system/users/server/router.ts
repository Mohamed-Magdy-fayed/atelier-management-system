import { createTRPCRouter, protectedProcedure } from "@/integrations/trpc/init";
import { commitUsersImport, previewUsersImport } from "./import";
import {
  bulkSetVerified,
  createUser,
  softDeleteUsers,
  updateUser,
} from "./mutations";
import { exportRows, listCustomers, listEmployees } from "./queries";
import {
  bulkSetVerifiedInput,
  commitImportInput,
  exportRowsInput,
  listCustomersInput,
  previewImportInput,
  softDeleteInput,
  userMutationSchema,
  userUpdateSchema,
} from "./schemas";

export const usersRouter = createTRPCRouter({
  listEmployees: protectedProcedure.query(async ({ ctx }) =>
    listEmployees(ctx),
  ),
  listCustomers: protectedProcedure
    .input(listCustomersInput)
    .query(async ({ ctx, input }) => listCustomers(ctx, input)),
  exportRows: protectedProcedure
    .input(exportRowsInput)
    .query(async ({ ctx, input }) => exportRows(ctx, input)),
  previewImport: protectedProcedure
    .input(previewImportInput)
    .mutation(async ({ ctx, input }) => previewUsersImport(ctx, input)),
  commitImport: protectedProcedure
    .input(commitImportInput)
    .mutation(async ({ ctx, input }) => commitUsersImport(ctx, input)),
  create: protectedProcedure
    .input(userMutationSchema)
    .mutation(async ({ ctx, input }) => createUser(ctx, input)),
  update: protectedProcedure
    .input(userUpdateSchema)
    .mutation(async ({ ctx, input }) => updateUser(ctx, input)),
  softDelete: protectedProcedure
    .input(softDeleteInput)
    .mutation(async ({ ctx, input }) => softDeleteUsers(ctx, input)),
  bulkSetVerified: protectedProcedure
    .input(bulkSetVerifiedInput)
    .mutation(async ({ ctx, input }) => bulkSetVerified(ctx, input)),
});
