import { z } from "zod";

import { userRoleValues } from "@/drizzle/schemas/auth";
import { translationKey } from "@/features/core/i18n/global";
import { branchShortCodeSchema } from "@/features/system/branches/server/schemas";

export const otpSchema = z
  .string()
  .trim()
  .regex(
    /^[0-9]{6}$/u,
    translationKey("authTranslations.validation.otpSixDigits"),
  );
export const passwordSchema = z
  .string()
  .min(6, translationKey("authTranslations.passwordMinLength"))
  .superRefine((value, ctx) => {
    if (!/[a-z]/.test(value)) {
      ctx.addIssue({
        code: "custom",
        message: translationKey("authTranslations.passwordLowercase"),
      });
    }

    if (!/[A-Z]/.test(value)) {
      ctx.addIssue({
        code: "custom",
        message: translationKey("authTranslations.passwordUppercase"),
      });
    }

    if (!/[0-9]/.test(value)) {
      ctx.addIssue({
        code: "custom",
        message: translationKey("authTranslations.passwordNumber"),
      });
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) {
      ctx.addIssue({
        code: "custom",
        message: translationKey("authTranslations.passwordSpecialChar"),
      });
    }
  });

export const signInEmailStepSchema = z.object({
  email: z.email(translationKey("authTranslations.validation.invalidEmail")),
  password: z.string(),
});

export const signInSchema = z.object({
  email: z.email(translationKey("authTranslations.validation.invalidEmail")),
  password: z
    .string()
    .min(6, translationKey("authTranslations.passwordMinLength")),
});

export const signUpSchema = z.object({
  name: z.string(),
  email: z.email(translationKey("authTranslations.validation.invalidEmail")),
  phone: z
    .string()
    .min(10, translationKey("authTranslations.profile.phone.error.invalid")),
  password: passwordSchema,
});

export const changeEmailSchema = z
  .object({
    newEmail: z.email(
      translationKey("authTranslations.validation.invalidEmail"),
    ),
    confirmEmail: z.email(
      translationKey("authTranslations.validation.invalidEmail"),
    ),
    // Some accounts (OAuth-only) may not have a password set.
    // Keep the value as a string (possibly empty) so it matches form inputs.
    currentPassword: passwordSchema,
  })
  .superRefine((values, ctx) => {
    if (values.newEmail !== values.confirmEmail) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmEmail"],
        message: translationKey("authTranslations.emailMismatch"),
      });
    }
  });

export const sessionSchema = z.object({
  sessionId: z.string(),
  exp: z.number(),
  hasPassword: z.boolean().optional().default(false),
  user: z.object({
    id: z.string(),
    role: z.enum(userRoleValues),
    email: z.string().optional().nullable(),
    name: z.string().optional().nullable(),
    emailVerifiedAt: z.preprocess(
      (val) => (val instanceof Date ? val.toISOString() : val),
      z.string().optional().nullable(),
    ),
  }),
});

export const passwordResetRequestSchema = z.object({
  email: z.email(translationKey("authTranslations.validation.invalidEmail")),
});
export const passwordResetSubmissionSchema = z.object({
  email: z.email(translationKey("authTranslations.validation.invalidEmail")),
  otp: otpSchema,
  password: passwordSchema,
});

export const changePasswordSchema = z
  .object({
    currentPassword: passwordSchema,
    newPassword: passwordSchema,
    confirmPassword: passwordSchema,
  })
  .superRefine((values, ctx) => {
    if (values.newPassword !== values.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: translationKey("authTranslations.passwordMismatch"),
      });
    }
  });

export const createPasswordSchema = z
  .object({
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .superRefine((values, ctx) => {
    if (values.newPassword !== values.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: translationKey("authTranslations.passwordMismatch"),
      });
    }
  });

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1, translationKey("authTranslations.required")),
  phone: z.string().trim().nullable(),
  imageUrl: z
    .url(translationKey("authTranslations.validation.invalidUrl"))
    .nullable(),
  age: z.number().int().positive().nullable(),
});

export const createBranchSchema = z.object({
  shortCode: branchShortCodeSchema,
  nameEn: z.string(),
  nameAr: z.string(),
});

export const updateBranchSchema = z.object({
  branchId: z.uuid(),
  nameEn: z.string(),
  nameAr: z.string(),
});
