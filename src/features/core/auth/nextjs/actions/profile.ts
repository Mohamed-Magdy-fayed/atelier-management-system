"use server";

import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import type { z } from "zod";

import { db } from "@/drizzle";
import { UserCredentialsTable, UsersTable } from "@/drizzle/schema";
import { updateUserSessionExpiration } from "@/features/core/auth/core";
import {
    comparePasswords,
    generateSalt,
    hashPassword,
} from "@/features/core/auth/core/passwordHasher";
import { revalidateAuthCache } from "@/features/core/auth/db-cache";
import { validateInput } from "@/features/core/auth/nextjs/actions/helpers";
import { getCurrentUser } from "@/features/core/auth/nextjs/currentUser";
import {
    changePasswordSchema,
    createPasswordSchema,
    updateProfileSchema,
} from "@/features/core/auth/schemas";
import type { TypedResponse } from "@/features/core/auth/types";
import { getT } from "@/features/core/i18n/server";

export async function updateProfileNameAction(
    rawInput: z.infer<typeof updateProfileSchema>,
): Promise<TypedResponse<{ updated: true; message: string }>> {
    const { t } = await getT();
    const { id: userId } = await getCurrentUser({ redirectIfNotFound: true });

    const data = await validateInput(updateProfileSchema, rawInput);

    await db.update(UsersTable).set(data).where(eq(UsersTable.id, userId));

    revalidateAuthCache({ id: userId, branchId: "" });

    return {
        isError: false,
        updated: true,
        message: t("authTranslations.profile.form.submit"),
    };
}

export async function changePasswordAction(
    rawInput: z.infer<typeof changePasswordSchema>,
): Promise<TypedResponse<unknown>> {
    const { t } = await getT();
    const { id: userId } = await getCurrentUser({ redirectIfNotFound: true });

    const parsed = await validateInput(changePasswordSchema, rawInput);

    const { currentPassword, newPassword } = parsed;

    const credentials = await db.query.UserCredentialsTable.findFirst({
        columns: { passwordHash: true, passwordSalt: true },
        where: eq(UserCredentialsTable.userId, userId),
    });

    if (!credentials) {
        return {
            isError: true,
            message: t("authTranslations.error.noPassword"),
        };
    }

    const isValid = await comparePasswords({
        password: currentPassword,
        hashedPassword: credentials.passwordHash,
        salt: credentials.passwordSalt,
    });

    if (!isValid) {
        return {
            isError: true,
            message: t("authTranslations.profile.email.error.passwordIncorrect"),
        };
    }

    const salt = generateSalt();
    const passwordHash = await hashPassword(newPassword, salt);
    const now = new Date();

    await db
        .update(UserCredentialsTable)
        .set({
            passwordHash,
            passwordSalt: salt,
            mustChangePassword: false,
            lastChangedAt: now,
        })
        .where(eq(UserCredentialsTable.userId, userId));

    await updateUserSessionExpiration(await cookies());

    return {
        isError: false,
    };
}

export async function createPasswordAction(
    rawInput: z.infer<typeof createPasswordSchema>,
): Promise<TypedResponse<unknown>> {
    const { t } = await getT();
    const { id: userId } = await getCurrentUser({ redirectIfNotFound: true });

    const parsed = createPasswordSchema.safeParse(rawInput);
    if (!parsed.success) {
        return {
            isError: true,
            message: t("authTranslations.profile.error.invalidInput"),
        };
    }

    const { newPassword } = parsed.data;

    const existing = await db.query.UserCredentialsTable.findFirst({
        columns: { userId: true },
        where: eq(UserCredentialsTable.userId, userId),
    });

    if (existing) {
        return {
            isError: true,
            message: t("authTranslations.error.badRequest"),
        };
    }

    const salt = generateSalt();
    const passwordHash = await hashPassword(newPassword, salt);
    const now = new Date();

    await db.insert(UserCredentialsTable).values({
        userId,
        passwordHash,
        passwordSalt: salt,
        mustChangePassword: false,
        lastChangedAt: now,
    });

    await updateUserSessionExpiration(await cookies());

    return {
        isError: false,
    };
}
