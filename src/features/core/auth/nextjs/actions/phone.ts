"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { db } from "@/drizzle";
import { getCurrentUser } from "@/features/core/auth/nextjs/currentUser";
import {
    beginPhoneChangeSchema,
    confirmPhoneChangeSchema,
} from "@/features/core/auth/schemas";
import { UsersTable } from "@/features/core/auth/tables";
import type { TypedResponse } from "@/features/core/auth/types";
import { getT } from "@/features/core/i18n/actions";
import { sendPhoneOtp, verifyPhoneOtp } from "@/integrations/whatsapp/otp";

export async function beginPhoneChangeAction(
    rawInput: z.infer<typeof beginPhoneChangeSchema>,
): Promise<TypedResponse<{ sent: true; phone: string }>> {
    const { t } = await getT();
    const { id: userId } = await getCurrentUser({ redirectIfNotFound: true });

    const parsed = beginPhoneChangeSchema.safeParse(rawInput);
    if (!parsed.success) {
        return {
            isError: true,
            message: t("authTranslations.profile.error.invalidInput"),
        };
    }

    const user = await db.query.UsersTable.findFirst({
        columns: { phone: true },
        where: eq(UsersTable.id, userId),
    });

    if (user?.phone && parsed.data.phone === user.phone) {
        return {
            isError: true,
            message: t("authTranslations.profile.phone.error.same"),
        };
    }

    const conflict = await db.query.UsersTable.findFirst({
        columns: { id: true },
        where: and(
            eq(UsersTable.phone, parsed.data.phone),
            ne(UsersTable.id, userId),
        ),
    });
    if (conflict) {
        return {
            isError: true,
            message: t("authTranslations.profile.phone.error.inUse"),
        };
    }

    try {
        await sendPhoneOtp(parsed.data.phone);
    } catch (error) {
        return {
            isError: true,
            message:
                error instanceof Error
                    ? error.message
                    : t("authTranslations.profile.phone.error.invalid"),
        };
    }

    return {
        isError: false,
        sent: true,
        phone: parsed.data.phone,
    };
}

export async function confirmPhoneChangeAction(
    rawInput: z.infer<typeof confirmPhoneChangeSchema>,
): Promise<TypedResponse<{ changed: true }>> {
    const { t } = await getT();
    const { id: userId } = await getCurrentUser({ redirectIfNotFound: true });

    const parsed = confirmPhoneChangeSchema.safeParse(rawInput);
    if (!parsed.success) {
        return {
            isError: true,
            message: t("authTranslations.profile.error.invalidInput"),
        };
    }

    const conflict = await db.query.UsersTable.findFirst({
        columns: { id: true },
        where: and(
            eq(UsersTable.phone, parsed.data.phone),
            ne(UsersTable.id, userId),
        ),
    });
    if (conflict) {
        return {
            isError: true,
            message: t("authTranslations.profile.phone.error.inUse"),
        };
    }

    try {
        await verifyPhoneOtp(parsed.data.phone, parsed.data.otp);
    } catch (error) {
        return {
            isError: true,
            message:
                error instanceof Error
                    ? error.message
                    : t("authTranslations.profile.phone.error.otpInvalid"),
        };
    }

    await db
        .update(UsersTable)
        .set({
            phone: parsed.data.phone,
            phoneVerifiedAt: new Date(),
        })
        .where(eq(UsersTable.id, userId));

    revalidatePath("/");

    return {
        isError: false,
        changed: true,
    };
}
