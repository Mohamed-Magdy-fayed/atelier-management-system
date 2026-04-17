"use server";

import { eq } from "drizzle-orm";
import type { z } from "zod";
import { db } from "@/drizzle";
import {
    customerOtpStepSchema,
    customerPhoneStepSchema,
} from "@/features/core/auth/schemas";
import { UsersTable } from "@/features/core/auth/tables";
import type { TypedResponse } from "@/features/core/auth/types";
import { getT } from "@/features/core/i18n/actions";
import { sendPhoneOtp, verifyPhoneOtp } from "@/integrations/whatsapp/otp";

export async function sendSignUpOtpAction(
    rawInput: z.infer<typeof customerPhoneStepSchema>,
): Promise<TypedResponse<{ verificationId: string }>> {
    const { t } = await getT();

    const parsed = customerPhoneStepSchema.safeParse(rawInput);
    if (!parsed.success) {
        return {
            isError: true,
            message: t("authTranslations.error.badRequest"),
        };
    }

    const { phone } = parsed.data;

    const exists = await db.query.UsersTable.findFirst({
        where: eq(UsersTable.phone, phone),
        columns: { id: true },
    });
    if (exists) {
        return {
            isError: true,
            message: t("authTranslations.signUp.error.duplicate"),
        };
    }

    try {
        const result = await sendPhoneOtp(phone);
        return {
            isError: false,
            verificationId: result.verificationId,
        };
    } catch (error) {
        return {
            isError: true,
            message:
                error instanceof Error
                    ? error.message
                    : t("authTranslations.signUp.error.generic"),
        };
    }
}

export async function verifySignUpOtpAction(
    rawInput: z.infer<typeof customerOtpStepSchema>,
): Promise<TypedResponse<{ verificationId: string }>> {
    const { t } = await getT();

    const parsed = customerOtpStepSchema.safeParse(rawInput);
    if (!parsed.success) {
        return {
            isError: true,
            message: t("authTranslations.error.badRequest"),
        };
    }

    try {
        const result = await verifyPhoneOtp(parsed.data.phone, parsed.data.otp);
        return {
            isError: false,
            verificationId: result.verificationId,
        };
    } catch (error) {
        return {
            isError: true,
            message:
                error instanceof Error
                    ? error.message
                    : t("authTranslations.profile.phone.error.otpInvalid"),
        };
    }
}
