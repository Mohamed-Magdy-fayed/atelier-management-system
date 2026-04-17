import { z } from "zod";
import { userRoleValues } from "@/features/core/auth/tables";

export const phoneSchema = z.string().trim().min(7, "authTranslations.validation.phoneMin").max(16, "authTranslations.validation.phoneMax");
export const otpSchema = z.string().trim().regex(/^[0-9]{6}$/u, "authTranslations.validation.otpSixDigits");
export const passwordSchema = z
	.string().min(6, "authTranslations.passwordMinLength")
	.superRefine((value, ctx) => {
		if (!/[a-z]/.test(value)) {
			ctx.addIssue({
				code: "custom",
				message: "authTranslations.passwordLowercase",
			});
		}

		if (!/[A-Z]/.test(value)) {
			ctx.addIssue({
				code: "custom",
				message: "authTranslations.passwordUppercase",
			});
		}

		if (!/[0-9]/.test(value)) {
			ctx.addIssue({
				code: "custom",
				message: "authTranslations.passwordNumber",
			});
		}

		if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) {
			ctx.addIssue({
				code: "custom",
				message: "authTranslations.passwordSpecialChar",
			});
		}
	});

export const signInSchema = z.object({
	phone: phoneSchema,
	password: z.string().min(6, "authTranslations.passwordMinLength"),
});

export const signUpSchema = z.object({
	name: z.string(),
	email: z.email(),
	phone: z.string(),
	password: passwordSchema,
});

export const changeEmailSchema = z
	.object({
		newEmail: z.email("authTranslations.validation.invalidEmail"),
		confirmEmail: z.email("authTranslations.validation.invalidEmail"),
		// Some accounts (OAuth-only) may not have a password set.
		// Keep the value as a string (possibly empty) so it matches form inputs.
		currentPassword: z.string(),
	})
	.superRefine((values, ctx) => {
		if (values.newEmail !== values.confirmEmail) {
			ctx.addIssue({
				code: "custom",
				path: ["confirmEmail"],
				message: "authTranslations.emailMismatch",
			});
		}
	});

export const beginPhoneChangeSchema = z.object({
	phone: phoneSchema,
});

export const confirmPhoneChangeSchema = z.object({
	phone: phoneSchema,
	otp: otpSchema,
});

export const sessionSchema = z.object({
	sessionId: z.string(),
	exp: z.number(),
	user: z.object({
		id: z.string(),
		role: z.enum(userRoleValues),
	}),
});

export const passwordResetRequestSchema = z.object({
	phone: phoneSchema,
});
export const passwordResetSubmissionSchema = z.object({
	phone: phoneSchema,
	otp: otpSchema,
	password: passwordSchema,
});

export const changePasswordSchema = z
	.object({
		currentPassword: z.string(),
		newPassword: passwordSchema,
		confirmPassword: z.string(),
	})
	.superRefine((values, ctx) => {
		if (values.newPassword !== values.confirmPassword) {
			ctx.addIssue({
				code: "custom",
				path: ["confirmPassword"],
				message: "authTranslations.passwordMismatch",
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
				message: "authTranslations.passwordMismatch",
			});
		}
	});

export const updateProfileSchema = z.object({
	name: z.string().trim().min(1, "authTranslations.required"),
});

export const createBranchSchema = z.object({
	nameEn: z.string(),
	nameAr: z.string(),
});

export const updateBranchSchema = createBranchSchema.extend({
	branchId: z.uuid(),
});

export const customerPhoneStepSchema = z.object({
	phone: phoneSchema,
});

export const customerOtpStepSchema = z.object({
	phone: phoneSchema,
	otp: otpSchema,
});

export const customerDetailsStepSchema = z.object({
	phone: phoneSchema,
	verificationId: z.uuid(),
	name: z.string().min(1, "authTranslations.required"),
	email: z.union([z.email("authTranslations.validation.invalidEmail"), z.literal("")]),
	password: passwordSchema,
});
