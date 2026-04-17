"use server";

import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/drizzle";
import { env } from "@/env/server";
import { comparePasswords } from "@/features/core/auth/core";
import { normalizeEmail } from "@/features/core/auth/core/helpers";
import { createTokenValue, hashTokenValue } from "@/features/core/auth/core/token";
import { getCurrentUser } from "@/features/core/auth/nextjs/currentUser";
import {
    sendEmailChangeVerification,
    sendEmailVerificationEmail,
} from "@/features/core/auth/nextjs/emails";
import { changeEmailSchema } from "@/features/core/auth/schemas";
import {
    UserCredentialsTable,
    UsersTable,
    UserTokensTable,
} from "@/features/core/auth/tables";
import type { TypedResponse } from "@/features/core/auth/types";
import { getT } from "@/features/core/i18n/actions";

const EMAIL_TOKEN_TTL_MS = 1000 * 60 * 60 * 24;
const verifyEmailTokenSchema = z.object({ token: z.string().min(1) });

type EmailTokenMetadata = {
    operation?: unknown;
    newEmail?: unknown;
    normalizedEmail?: unknown;
    currentEmail?: unknown;
};

export async function beginEmailVerificationAction(): Promise<
    TypedResponse<{ sent: true }>
> {
    const { t } = await getT();
    const { id: userId } = await getCurrentUser({ redirectIfNotFound: true });

    const user = await db.query.UsersTable.findFirst({
        where: eq(UsersTable.id, userId),
        columns: { id: true, email: true, name: true },
    });

    if (!user?.email) {
        return {
            isError: true,
            message: t("authTranslations.emailVerification.error.missingEmail"),
        };
    }

    const token = createTokenValue();
    const tokenHash = hashTokenValue(token);
    const expiresAt = new Date(Date.now() + EMAIL_TOKEN_TTL_MS);
    const normalizedEmail = normalizeEmail(user.email);

    await db.transaction(async (trx) => {
        await trx
            .delete(UserTokensTable)
            .where(
                and(
                    eq(UserTokensTable.userId, user.id),
                    eq(UserTokensTable.type, "email_verification"),
                ),
            );

        await trx.insert(UserTokensTable).values({
            userId: user.id,
            tokenHash,
            type: "email_verification",
            expiresAt,
            metadata: { operation: "verify", normalizedEmail },
        });
    });

    const verificationUrl = `${env.BASE_URL}/verify-email?${new URLSearchParams({ token }).toString()}`;

    try {
        await sendEmailVerificationEmail({
            email: user.email,
            verificationUrl,
        });
    } catch {
        return {
            isError: true,
            message: t("authTranslations.emailVerification.error.sendFailed"),
        };
    }

    return { isError: false, sent: true };
}

export async function beginEmailChangeAction(
    rawInput: z.infer<typeof changeEmailSchema>,
): Promise<TypedResponse<{ sent: true }>> {
    const { t } = await getT();
    const { id: userId } = await getCurrentUser({ redirectIfNotFound: true });

    const parsed = changeEmailSchema.safeParse(rawInput);
    if (!parsed.success) {
        return {
            isError: true,
            message: t("authTranslations.profile.error.invalidInput"),
        };
    }

    const user = await db.query.UsersTable.findFirst({
        where: eq(UsersTable.id, userId),
        columns: { id: true, email: true, name: true },
    });

    if (!user) {
        return {
            isError: true,
            message: t("authTranslations.error.badRequest"),
        };
    }

    const currentEmail = user.email;
    const normalizedCurrentEmail = currentEmail
        ? normalizeEmail(currentEmail)
        : null;
    const normalizedNewEmail = normalizeEmail(parsed.data.newEmail);

    if (normalizedCurrentEmail && normalizedNewEmail === normalizedCurrentEmail) {
        return {
            isError: true,
            message: t("authTranslations.profile.email.error.sameAddress"),
        };
    }

    const conflict = await db.query.UsersTable.findFirst({
        columns: { id: true },
        where: eq(UsersTable.email, normalizedNewEmail),
    });
    if (conflict) {
        return {
            isError: true,
            message: t("authTranslations.profile.email.error.inUse"),
        };
    }

    const credentials = await db.query.UserCredentialsTable.findFirst({
        where: eq(UserCredentialsTable.userId, user.id),
        columns: { passwordHash: true, passwordSalt: true },
    });

    if (credentials) {
        if (!parsed.data.currentPassword) {
            return {
                isError: true,
                message: t("authTranslations.profile.email.error.passwordRequired"),
            };
        }

        const isPasswordValid = await comparePasswords({
            hashedPassword: credentials.passwordHash,
            salt: credentials.passwordSalt,
            password: parsed.data.currentPassword,
        });
        if (!isPasswordValid) {
            return {
                isError: true,
                message: t("authTranslations.profile.email.error.passwordIncorrect"),
            };
        }
    }

    const token = createTokenValue();
    const tokenHash = hashTokenValue(token);
    const expiresAt = new Date(Date.now() + EMAIL_TOKEN_TTL_MS);

    await db.transaction(async (trx) => {
        await trx
            .delete(UserTokensTable)
            .where(
                and(
                    eq(UserTokensTable.userId, user.id),
                    eq(UserTokensTable.type, "email_verification"),
                ),
            );

        await trx.insert(UserTokensTable).values({
            userId: user.id,
            tokenHash,
            type: "email_verification",
            expiresAt,
            metadata: {
                operation: "change",
                newEmail: parsed.data.newEmail,
                normalizedEmail: normalizedNewEmail,
                currentEmail,
            },
        });
    });

    const verificationUrl = `${env.BASE_URL}/verify-email?${new URLSearchParams({ token }).toString()}`;

    try {
        if (currentEmail) {
            await sendEmailChangeVerification({
                email: parsed.data.newEmail,
                verificationUrl,
            });
        } else {
            await sendEmailVerificationEmail({
                email: parsed.data.newEmail,
                verificationUrl,
            });
        }
    } catch {
        return {
            isError: true,
            message: t("authTranslations.profile.email.error.sendFailed"),
        };
    }

    return { isError: false, sent: true };
}

export async function verifyEmailTokenAction(
    rawInput: z.infer<typeof verifyEmailTokenSchema>,
): Promise<TypedResponse<{ status: "verified" | "changed" }>> {
    const { t } = await getT();
    const parsed = verifyEmailTokenSchema.safeParse(rawInput);
    if (!parsed.success) {
        return {
            isError: true,
            message: t("authTranslations.emailVerification.error.invalidToken"),
        };
    }

    const { token } = parsed.data;
    const tokenHash = hashTokenValue(token);
    const record = await db.query.UserTokensTable.findFirst({
        columns: {
            id: true,
            userId: true,
            expiresAt: true,
            consumedAt: true,
            metadata: true,
        },
        where: and(
            eq(UserTokensTable.tokenHash, tokenHash),
            eq(UserTokensTable.type, "email_verification"),
        ),
    });

    const userId = record?.userId;
    if (!record || !userId) {
        return {
            isError: true,
            message: t("authTranslations.emailVerification.error.invalidToken"),
        };
    }

    const now = new Date();
    if (
        record.consumedAt != null ||
        record.expiresAt.getTime() <= now.getTime()
    ) {
        return {
            isError: true,
            message: t("authTranslations.emailVerification.error.expired"),
        };
    }

    const metadata = (record.metadata ?? {}) as EmailTokenMetadata;
    const operation = metadata.operation === "change" ? "change" : "verify";

    if (operation === "change") {
        const newEmail =
            typeof metadata.newEmail === "string" ? metadata.newEmail : null;
        const normalizedEmail =
            typeof metadata.normalizedEmail === "string"
                ? metadata.normalizedEmail
                : newEmail
                    ? normalizeEmail(newEmail)
                    : null;

        if (!newEmail || !normalizedEmail) {
            return {
                isError: true,
                message: t("authTranslations.emailVerification.error.invalidToken"),
            };
        }

        const conflict = await db.query.UsersTable.findFirst({
            columns: { id: true },
            where: and(
                eq(UsersTable.email, normalizedEmail),
                ne(UsersTable.id, userId),
            ),
        });
        if (conflict) {
            return {
                isError: true,
                message: t("authTranslations.emailVerification.error.conflict"),
            };
        }

        await db.transaction(async (trx) => {
            await trx
                .update(UsersTable)
                .set({ email: newEmail, emailVerifiedAt: now })
                .where(eq(UsersTable.id, userId));

            await trx
                .update(UserTokensTable)
                .set({ consumedAt: now })
                .where(eq(UserTokensTable.id, record.id));
            await trx
                .delete(UserTokensTable)
                .where(
                    and(
                        eq(UserTokensTable.userId, userId),
                        eq(UserTokensTable.type, "email_verification"),
                        ne(UserTokensTable.id, record.id),
                    ),
                );
        });

        return { isError: false, status: "changed" };
    }

    await db.transaction(async (trx) => {
        await trx
            .update(UsersTable)
            .set({ emailVerifiedAt: now })
            .where(eq(UsersTable.id, userId));
        await trx
            .update(UserTokensTable)
            .set({ consumedAt: now })
            .where(eq(UserTokensTable.id, record.id));
        await trx
            .delete(UserTokensTable)
            .where(
                and(
                    eq(UserTokensTable.userId, userId),
                    eq(UserTokensTable.type, "email_verification"),
                    ne(UserTokensTable.id, record.id),
                ),
            );
    });

    return { isError: false, status: "verified" };
}
