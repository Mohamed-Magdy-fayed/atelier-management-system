"use server";

import crypto from "crypto";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import type { z } from "zod";
import { db } from "@/drizzle";
import { env } from "@/env/server";
import {
    generateSalt,
    hashPassword,
} from "@/features/core/auth/core/passwordHasher";
import { hashTokenValue } from "@/features/core/auth/core/token";
import {
    passwordResetRequestSchema,
    passwordResetSubmissionSchema,
} from "@/features/core/auth/schemas";
import {
    UserCredentialsTable,
    UsersTable,
    UserTokensTable,
} from "@/features/core/auth/tables";
import type { TypedResponse } from "@/features/core/auth/types";
import { getT } from "@/features/core/i18n/actions";
import { rateLimitOTP, toChatId } from "@/integrations/whatsapp/otp";
import { sendText } from "@/integrations/whatsapp/wapilot-api";

const PASSWORD_RESET_OTP_LENGTH = 6;
const PASSWORD_RESET_OTP_TTL_MS = 1000 * 60 * 10; // 10 minutes

function generateResetOtp() {
    return crypto
        .randomInt(0, 10 ** PASSWORD_RESET_OTP_LENGTH)
        .toString()
        .padStart(PASSWORD_RESET_OTP_LENGTH, "0");
}

function hashPasswordResetOtp(phone: string, otp: string) {
    return hashTokenValue(`${phone}:${otp}`);
}

export async function requestPasswordResetAction(
    rawInput: z.infer<typeof passwordResetRequestSchema>,
): Promise<TypedResponse<{}>> {
    const { t } = await getT();
    const parsed = passwordResetRequestSchema.safeParse(rawInput);
    if (!parsed.success) {
        return {
            isError: true,
            message: t("authTranslations.passwordReset.request.invalidPhone"),
        };
    }

    await rateLimitOTP(parsed.data.phone);

    const user = await db.query.UsersTable.findFirst({
        columns: { id: true, phone: true, name: true },
        where: eq(UsersTable.phone, parsed.data.phone),
    });

    // Avoid account enumeration
    if (!user || !user.phone) {
        redirect(`/reset-password?phone=${encodeURIComponent(parsed.data.phone)}`);
    }

    const otp = generateResetOtp();
    const tokenHash = hashPasswordResetOtp(parsed.data.phone, otp);
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_OTP_TTL_MS);

    await db.transaction(async (trx) => {
        await trx
            .delete(UserTokensTable)
            .where(
                and(
                    eq(UserTokensTable.userId, user.id),
                    eq(UserTokensTable.type, "password_reset"),
                ),
            );

        await trx.insert(UserTokensTable).values({
            userId: user.id,
            tokenHash,
            type: "password_reset",
            expiresAt,
            metadata: {
                phone: parsed.data.phone,
            },
        });
    });

    try {
        await sendText({
            instanceId: env.WAPILOT_INSTANCE_ID,
            token: env.WAPILOT_API_TOKEN,
            params: {
                chat_id: toChatId(parsed.data.phone),
                text: `Your password reset code is: ${otp}\n\nThis code expires in 10 minutes.`,
            },
        });
    } catch {
        // Best-effort cleanup to prevent dangling usable tokens
        await db
            .delete(UserTokensTable)
            .where(eq(UserTokensTable.tokenHash, tokenHash));
        return {
            isError: true,
            message: t("authTranslations.passwordReset.request.phoneError"),
        };
    }

    redirect(`/reset-password?phone=${encodeURIComponent(parsed.data.phone)}`);
}

export async function resetPasswordAction(
    rawInput: unknown,
): Promise<TypedResponse<{}>> {
    const { t } = await getT();
    const parsed = passwordResetSubmissionSchema.safeParse(rawInput);
    if (!parsed.success) {
        return {
            isError: true,
            message: t("authTranslations.passwordReset.reset.invalidCode"),
        };
    }

    const tokenHash = hashPasswordResetOtp(parsed.data.phone, parsed.data.otp);
    const now = new Date();

    const tokenRecord = await db.query.UserTokensTable.findFirst({
        columns: {
            id: true,
            userId: true,
            expiresAt: true,
            consumedAt: true,
            metadata: true,
        },
        where: and(
            eq(UserTokensTable.tokenHash, tokenHash),
            eq(UserTokensTable.type, "password_reset"),
        ),
    });

    if (
        !tokenRecord ||
        tokenRecord.consumedAt != null ||
        tokenRecord.expiresAt.getTime() <= now.getTime()
    ) {
        return {
            isError: true,
            message: t("authTranslations.passwordReset.reset.invalidCode"),
        };
    }

    const metadata = (tokenRecord.metadata ?? {}) as {
        phone?: unknown;
    };
    const tokenPhone = typeof metadata.phone === "string" ? metadata.phone : null;
    if (tokenPhone && tokenPhone !== parsed.data.phone) {
        return {
            isError: true,
            message: t("authTranslations.passwordReset.reset.invalidCode"),
        };
    }

    const user = await db.query.UsersTable.findFirst({
        columns: { id: true, phone: true },
        where: eq(UsersTable.id, tokenRecord.userId ?? ""),
    });

    if (!user || !user.phone || user.phone !== parsed.data.phone) {
        return {
            isError: true,
            message: t("authTranslations.passwordReset.reset.invalidCode"),
        };
    }

    const salt = generateSalt();
    const passwordHash = await hashPassword(parsed.data.password, salt);

    try {
        await db.transaction(async (trx) => {
            const credentials = await trx.query.UserCredentialsTable.findFirst({
                columns: { userId: true },
                where: eq(UserCredentialsTable.userId, user.id),
            });

            if (credentials) {
                await trx
                    .update(UserCredentialsTable)
                    .set({
                        passwordHash,
                        passwordSalt: salt,
                        mustChangePassword: false,
                        lastChangedAt: now,
                    })
                    .where(eq(UserCredentialsTable.userId, user.id));
            } else {
                await trx.insert(UserCredentialsTable).values({
                    userId: user.id,
                    passwordHash,
                    passwordSalt: salt,
                    mustChangePassword: false,
                    lastChangedAt: now,
                });
            }

            await trx
                .update(UserTokensTable)
                .set({ consumedAt: now })
                .where(eq(UserTokensTable.id, tokenRecord.id));
        });
    } catch {
        return {
            isError: true,
            message: t("authTranslations.passwordReset.reset.error"),
        };
    }

    redirect("/sign-in?reset=success");
}
