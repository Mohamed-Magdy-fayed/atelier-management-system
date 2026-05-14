import { createTRPCRouter, protectedProcedure } from "@/integrations/trpc/init";

import { createBranch, deleteBranch, updateBranch } from "./mutations";
import { listBranches } from "./queries";
import {
  branchDeleteSchema,
  branchMutationSchema,
  branchUpdateSchema,
  listBranchesInput,
} from "./schemas";

export const branchesRouter = createTRPCRouter({
  list: protectedProcedure
    .input(listBranchesInput)
    .query(async ({ ctx, input }) => listBranches(ctx, input)),
  create: protectedProcedure
    .input(branchMutationSchema)
    .mutation(async ({ ctx, input }) => createBranch(ctx, input)),
  update: protectedProcedure
    .input(branchUpdateSchema)
    .mutation(async ({ ctx, input }) => updateBranch(ctx, input)),
  delete: protectedProcedure
    .input(branchDeleteSchema)
    .mutation(async ({ ctx, input }) => deleteBranch(ctx, input)),
});
