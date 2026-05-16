import { z } from "zod";

import { translationKey } from "@/features/core/i18n/global";
import {
  isValidBranchShortCode,
  normalizeBranchShortCode,
} from "@/lib/branch-short-code";

export const branchShortCodeSchema = z
  .string()
  .trim()
  .min(1, translationKey("forms.validation.required"))
  .transform(normalizeBranchShortCode)
  .refine(isValidBranchShortCode, {
    message: translationKey("forms.validation.branchShortCode"),
  });

const optionalTimeHm = z

  .string()

  .max(8)

  .optional()

  .transform((value) => value?.trim() ?? "");

const optionalHttpUrl = z

  .string()

  .max(2048)

  .optional()

  .transform((value) => value?.trim() ?? "")

  .refine(
    (value) => {
      if (!value) return true;

      try {
        const url = new URL(value);

        return url.protocol === "http:" || url.protocol === "https:";
      } catch {
        return false;
      }
    },

    { message: "Map link must be a valid http(s) URL" },
  );

export const listBranchesInput = z.object({
  page: z.number().int().min(1).default(1),

  perPage: z.number().int().min(1).max(100).default(20),

  sorting: z.array(z.object({ id: z.string(), desc: z.boolean() })).default([]),

  globalFilter: z.string().optional(),
});

export const branchMutationSchema = z

  .object({
    shortCode: branchShortCodeSchema,

    nameEn: z.string().trim().min(1).max(128),

    nameAr: z.string().trim().min(1).max(128),

    addressEn: z.string().max(4000).optional(),

    addressAr: z.string().max(4000).optional(),

    phone: z.string().max(32).optional(),

    opensAt: optionalTimeHm,

    closesAt: optionalTimeHm,

    mapUrl: optionalHttpUrl,
  })

  .superRefine((data, ctx) => {
    const hasOpen = Boolean(data.opensAt);

    const hasClose = Boolean(data.closesAt);

    if (hasOpen !== hasClose) {
      ctx.addIssue({
        code: "custom",

        message: "Provide both opening and closing times, or leave both empty",

        path: ["closesAt"],
      });
    }

    if (hasOpen && !/^\d{2}:\d{2}$/.test(data.opensAt)) {
      ctx.addIssue({
        code: "custom",

        message: "Invalid opening time",

        path: ["opensAt"],
      });
    }

    if (hasClose && !/^\d{2}:\d{2}$/.test(data.closesAt)) {
      ctx.addIssue({
        code: "custom",

        message: "Invalid closing time",

        path: ["closesAt"],
      });
    }
  });

export const branchUpdateSchema = branchMutationSchema.extend({
  id: z.string().uuid(),
});

export const branchDeleteSchema = z.object({
  id: z.string().uuid(),
});

export type ListBranchesInput = z.infer<typeof listBranchesInput>;

export type BranchMutationInput = z.infer<typeof branchMutationSchema>;

export type BranchUpdateInput = z.infer<typeof branchUpdateSchema>;

export type BranchDeleteInput = z.infer<typeof branchDeleteSchema>;
