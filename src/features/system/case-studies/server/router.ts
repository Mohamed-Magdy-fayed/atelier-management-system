import { z } from "zod";

import {
  baseProcedure,
  createTRPCRouter,
  protectedProcedure,
} from "@/integrations/trpc/init";

import {
  archiveCaseStudy,
  createCaseStudy,
  deleteCaseStudy,
  publishCaseStudy,
  updateCaseStudy,
} from "./mutations";
import {
  getCaseStudyById,
  getPublishedCaseStudyBySlug,
  listCaseStudies,
  listPublishedCaseStudies,
} from "./queries";
import {
  caseStudyArchiveSchema,
  caseStudyDeleteSchema,
  caseStudyMutationSchema,
  caseStudyPublishSchema,
  caseStudyUpdateSchema,
  listCaseStudiesInput,
} from "./schemas";

export const caseStudiesRouter = createTRPCRouter({
  publicList: baseProcedure.query(({ ctx }) => listPublishedCaseStudies(ctx)),
  publicGetBySlug: baseProcedure
    .input(z.object({ slug: z.string() }))
    .query(({ ctx, input }) => getPublishedCaseStudyBySlug(ctx, input.slug)),
  list: protectedProcedure
    .input(listCaseStudiesInput)
    .query(({ ctx, input }) => listCaseStudies(ctx, input)),
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(({ ctx, input }) => getCaseStudyById(ctx, input.id)),
  create: protectedProcedure
    .input(caseStudyMutationSchema)
    .mutation(({ ctx, input }) => createCaseStudy(ctx, input)),
  update: protectedProcedure
    .input(caseStudyUpdateSchema)
    .mutation(({ ctx, input }) => updateCaseStudy(ctx, input)),
  publish: protectedProcedure
    .input(caseStudyPublishSchema)
    .mutation(({ ctx, input }) => publishCaseStudy(ctx, input.id)),
  archive: protectedProcedure
    .input(caseStudyArchiveSchema)
    .mutation(({ ctx, input }) => archiveCaseStudy(ctx, input.id)),
  delete: protectedProcedure
    .input(caseStudyDeleteSchema)
    .mutation(({ ctx, input }) => deleteCaseStudy(ctx, input.id)),
});
