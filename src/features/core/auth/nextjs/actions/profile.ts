"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import type { z } from "zod";
import { db } from "@/drizzle";
import { refreshSession } from "@/features/core/auth/core";
import {
    comparePasswords,
    generateSalt,
    hashPassword,
} from "@/features/core/auth/core/passwordHasher";
import { getCurrentUser } from "@/features/core/auth/nextjs/currentUser";
import {
    changePasswordSchema,
    createPasswordSchema,
    updateProfileSchema,
} from "@/features/core/auth/schemas";
import { UserCredentialsTable, UsersTable } from "@/features/core/auth/tables";
import type { TypedResponse } from "@/features/core/auth/types";
import { getT } from "@/features/core/i18n/actions";

export async function updateProfileNameAction(
    rawInput: z.infer<typeof updateProfileSchema>,
): Promise<TypedResponse<{ updated: true; message: string }>> {
    const { t } = await getT();
    const { id: userId } = await getCurrentUser({ redirectIfNotFound: true });

    const parsed = updateProfileSchema.safeParse(rawInput);
    if (!parsed.success) {
        return {
            isError: true,
            message: t("authTranslations.profile.error.invalidInput"),
        };
    }

    await db
        .update(UsersTable)
        .set({ name: parsed.data.name.trim() })
        .where(eq(UsersTable.id, userId));

    revalidatePath("/");

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

    const parsed = changePasswordSchema.safeParse(rawInput);
    if (!parsed.success) {
        return {
            isError: true,
            message: t("authTranslations.profile.error.invalidInput"),
        };
    }

    const { currentPassword, newPassword } = parsed.data;

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

    await refreshSession(await cookies());

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

    await refreshSession(await cookies());

    return {
        isError: false,
    };
}
