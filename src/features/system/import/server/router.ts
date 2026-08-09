import { createTRPCRouter, protectedProcedure } from "@/integrations/trpc/init";

import {
  cancelImportJob,
  commitImportBatch,
  createImportJob,
  startImportCommit,
  validateImportBatch,
} from "./mutations";
import {
  getImportJob,
  listImportJobRows,
  listImportJobs,
  listInvalidImportRows,
} from "./queries";
import {
  createImportJobInput,
  importBatchInput,
  importJobIdInput,
  listImportJobRowsInput,
  listImportJobsInput,
} from "./schemas";

export const importRouter = createTRPCRouter({
  createJob: protectedProcedure
    .input(createImportJobInput)
    .mutation(async ({ ctx, input }) => createImportJob(ctx, input)),
  validateBatch: protectedProcedure
    .input(importBatchInput)
    .mutation(async ({ ctx, input }) => validateImportBatch(ctx, input)),
  startCommit: protectedProcedure
    .input(importJobIdInput)
    .mutation(async ({ ctx, input }) => startImportCommit(ctx, input)),
  commitBatch: protectedProcedure
    .input(importBatchInput)
    .mutation(async ({ ctx, input }) => commitImportBatch(ctx, input)),
  cancelJob: protectedProcedure
    .input(importJobIdInput)
    .mutation(async ({ ctx, input }) => cancelImportJob(ctx, input)),
  getJob: protectedProcedure
    .input(importJobIdInput)
    .query(async ({ ctx, input }) => getImportJob(ctx, input)),
  listRows: protectedProcedure
    .input(listImportJobRowsInput)
    .query(async ({ ctx, input }) => listImportJobRows(ctx, input)),
  listInvalidRows: protectedProcedure
    .input(importJobIdInput)
    .query(async ({ ctx, input }) => listInvalidImportRows(ctx, input)),
  listJobs: protectedProcedure
    .input(listImportJobsInput)
    .query(async ({ ctx, input }) => listImportJobs(ctx, input)),
});
