import { createTRPCRouter, protectedProcedure } from "@/integrations/trpc/init";

import {
  bulkArchiveDresses,
  bulkSetDressesActive,
  createDress,
  deleteDress,
  setDressActive,
  updateDress,
  updateDressCurrentStatus,
} from "./mutations";
import {
  exportDresses,
  getDressById,
  listDresses,
  listDressFilterOptions,
} from "./queries";
import {
  dressBulkArchiveSchema,
  dressBulkSetActiveSchema,
  dressByIdSchema,
  dressDeleteSchema,
  dressFilterOptionsSchema,
  dressMutationSchema,
  dressSetActiveSchema,
  dressUpdateCurrentStatusSchema,
  dressUpdateSchema,
  exportDressesInput,
  listDressesInput,
} from "./schemas";

export const dressesRouter = createTRPCRouter({
  list: protectedProcedure
    .input(listDressesInput)
    .query(async ({ ctx, input }) => listDresses(ctx, input)),
  exportRows: protectedProcedure
    .input(exportDressesInput)
    .query(async ({ ctx, input }) => exportDresses(ctx, input)),
  getById: protectedProcedure
    .input(dressByIdSchema)
    .query(async ({ ctx, input }) => getDressById(ctx, input)),
  filterOptions: protectedProcedure
    .input(dressFilterOptionsSchema)
    .query(async ({ ctx, input }) => listDressFilterOptions(ctx, input)),
  create: protectedProcedure
    .input(dressMutationSchema)
    .mutation(async ({ ctx, input }) => createDress(ctx, input)),
  update: protectedProcedure
    .input(dressUpdateSchema)
    .mutation(async ({ ctx, input }) => updateDress(ctx, input)),
  setActive: protectedProcedure
    .input(dressSetActiveSchema)
    .mutation(async ({ ctx, input }) => setDressActive(ctx, input)),
  bulkSetActive: protectedProcedure
    .input(dressBulkSetActiveSchema)
    .mutation(async ({ ctx, input }) => bulkSetDressesActive(ctx, input)),
  bulkArchive: protectedProcedure
    .input(dressBulkArchiveSchema)
    .mutation(async ({ ctx, input }) => bulkArchiveDresses(ctx, input)),
  delete: protectedProcedure
    .input(dressDeleteSchema)
    .mutation(async ({ ctx, input }) => deleteDress(ctx, input)),
  updateStatus: protectedProcedure
    .input(dressUpdateCurrentStatusSchema)
    .mutation(async ({ ctx, input }) => updateDressCurrentStatus(ctx, input)),
});
