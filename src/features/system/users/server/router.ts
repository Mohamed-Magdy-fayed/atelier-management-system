import { createTRPCRouter, protectedProcedure } from "@/integrations/trpc/init";
import { commitUsersImport, previewUsersImport } from "./import";
import {
  bulkSetVerified,
  createUser,
  softDeleteUsers,
  updateUser,
} from "./mutations";
import {
  exportRows,
  getUserBranchIds,
  listAssignableBranches,
  listCustomers,
  listEmployees,
  resolveActors,
} from "./queries";
import { getUserScreenPermissions } from "./screen-permissions";
import {
  bulkSetVerifiedInput,
  commitImportInput,
  exportRowsInput,
  listCustomersInput,
  listEmployeesInput,
  previewImportInput,
  resolveActorsInput,
  softDeleteInput,
  userIdInput,
  userMutationSchema,
  userUpdateSchema,
} from "./schemas";

export const usersRouter = createTRPCRouter({
  listAssignableBranches: protectedProcedure.query(async ({ ctx }) =>
    listAssignableBranches(ctx),
  ),
  getBranchIds: protectedProcedure
    .input(userIdInput)
    .query(async ({ ctx, input }) => getUserBranchIds(ctx, input.id)),
  getScreenPermissions: protectedProcedure
    .input(userIdInput)
    .query(async ({ ctx, input }) => getUserScreenPermissions(ctx, input.id)),
  listEmployees: protectedProcedure
    .input(listEmployeesInput)
    .query(async ({ ctx, input }) => listEmployees(ctx, input)),
  listCustomers: protectedProcedure
    .input(listCustomersInput)
    .query(async ({ ctx, input }) => listCustomers(ctx, input)),
  resolveActors: protectedProcedure
    .input(resolveActorsInput)
    .query(async ({ ctx, input }) => resolveActors(ctx, input)),
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
