import { z } from "zod";

import { translationKey } from "@/features/core/i18n/global";

const required = translationKey("forms.validation.required");
const max255 = translationKey("forms.validation.max255");

export const caseStudyResultMetricSchema = z.object({
  label: z.string().min(1, required).max(128, max255),
  value: z.string().min(1, required).max(64, max255),
});

export const caseStudyMutationSchema = z.object({
  title: z.string().trim().min(1, required).max(255, max255),
  slug: z
    .string()
    .trim()
    .min(1, required)
    .max(255, max255)
    .regex(/^[a-z0-9-]+$/, translationKey("forms.validation.slugFormat")),
  client: z.string().trim().min(1, required).max(255, max255),
  industry: z.string().trim().min(1, required).max(128, max255),
  problemStatement: z.string().trim().min(1, required).max(4000),
  solution: z.string().trim().min(1, required).max(4000),
  results: z.object({
    metrics: z.array(caseStudyResultMetricSchema).min(1),
    summary: z.string().trim().min(1, required).max(512),
  }),
  coverImageUrl: z.string().max(1024).optional().nullable(),
  liveUrl: z.string().url().max(1024).optional().nullable(),
  sortOrder: z.number().int().min(0).default(0),
});

export const caseStudyUpdateSchema = caseStudyMutationSchema.extend({
  id: z.string().uuid(),
});

export const caseStudyPublishSchema = z.object({
  id: z.string().uuid(),
});

export const caseStudyArchiveSchema = z.object({
  id: z.string().uuid(),
});

export const caseStudyDeleteSchema = z.object({
  id: z.string().uuid(),
});

export const listCaseStudiesInput = z.object({
  page: z.number().int().min(1).default(1),
  perPage: z.number().int().min(1).max(100).default(20),
  sorting: z.array(z.object({ id: z.string(), desc: z.boolean() })).default([]),
  globalFilter: z.string().optional(),
  status: z
    .enum(["draft", "published", "archived", "all"])
    .optional()
    .default("all"),
  industry: z.string().optional(),
});

export type CaseStudyMutationInput = z.infer<typeof caseStudyMutationSchema>;
export type CaseStudyUpdateInput = z.infer<typeof caseStudyUpdateSchema>;
export type ListCaseStudiesInput = z.infer<typeof listCaseStudiesInput>;
