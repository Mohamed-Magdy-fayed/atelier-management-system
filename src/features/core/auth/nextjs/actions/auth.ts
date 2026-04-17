"use server";

import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/drizzle";
import { getOAuthClient } from "@/features/core/auth/core";
import { authError, normalizeEmail } from "@/features/core/auth/core/helpers";
import {
    comparePasswords,
    generateSalt,
    hashPassword,
} from "@/features/core/auth/core/passwordHasher";
import {
    createSession,
    removeSession,
} from "@/features/core/auth/core/session";
import { getCurrentUser } from "@/features/core/auth/nextjs/currentUser";
import {
    customerDetailsStepSchema,
    signInSchema,
    signUpSchema,
} from "@/features/core/auth/schemas";
import {
    type OAuthProvider,
    UserCredentialsTable,
    UsersTable,
} from "@/features/core/auth/tables";
import type {
    AuthState,
    PartialUser,
    TypedResponse,
} from "@/features/core/auth/types";
import { getT } from "@/features/core/i18n/actions";
import { assertPhoneVerified } from "@/integrations/whatsapp/otp";

export async function signInAction(
    input: unknown,
): Promise<TypedResponse<{ user: PartialUser }>> {
    const { t } = await getT();
    const parsed = signInSchema.safeParse(input);
    if (!parsed.success) {
        return {
            isError: true,
            message: t("authTranslations.error.credentials"),
        };
    }

    const { phone, password } = parsed.data;

    try {
        const user = await db.query.UsersTable.findFirst({
            columns: { id: true, role: true },
            where: eq(UsersTable.phone, phone),
            with: {
                credentials: { columns: { passwordHash: true, passwordSalt: true } },
            },
        });

        if (
            !user ||
            !user.credentials?.passwordHash ||
            !user.credentials?.passwordSalt
        ) {
            return {
                isError: true,
                message: t("authTranslations.error.credentials"),
            };
        }

        const isValid = await comparePasswords({
            password,
            hashedPassword: user.credentials.passwordHash,
            salt: user.credentials.passwordSalt,
        });

        if (!isValid) {
            return {
                isError: true,
                message: t("authTranslations.error.credentials"),
            };
        }

        await createSession(user, await cookies());
    } catch (error) {
        return authError(error);
    }

    redirect("/");
}

export async function signUpAction(
    input: unknown,
): Promise<TypedResponse<{ user: PartialUser }>> {
    const { t } = await getT();
    const parsed = customerDetailsStepSchema.safeParse(input);
    if (!parsed.success) {
        return {
            isError: true,
            message: t("authTranslations.error.badRequest"),
        };
    }

    try {
        await assertPhoneVerified(parsed.data.phone, parsed.data.verificationId);
    } catch {
        return {
            isError: true,
            message: t("authTranslations.signUp.error.generic"),
        };
    }

    const email = normalizeEmail(parsed.data.email);

    const result: TypedResponse<{ user: PartialUser }> = await db.transaction(
        async (trx) => {
            const existing = await trx.query.UsersTable.findFirst({
                columns: { id: true },
                where: eq(UsersTable.email, email),
            });

            if (existing) {
                return {
                    isError: true,
                    message: t("authTranslations.signUp.error.duplicate"),
                };
            }

            const salt = generateSalt();
            const passwordHash = await hashPassword(parsed.data.password, salt);

            const [user] = await trx
                .insert(UsersTable)
                .values({
                    name: parsed.data.name,
                    email,
                    phone: parsed.data.phone,
                    role: "customer",
                    createdBy: "sign-up",
                })
                .returning({
                    id: UsersTable.id,
                    email: UsersTable.email,
                    name: UsersTable.name,
                    role: UsersTable.role,
                });

            if (!user) {
                return {
                    isError: true,
                    message: t("authTranslations.signUp.error.generic"),
                };
            }

            await trx.insert(UserCredentialsTable).values({
                userId: user.id,
                passwordHash,
                passwordSalt: salt,
            });

            return { isError: false, user };
        },
    );

    if (result.isError) return { isError: true, message: result.message };
    await createSession(result.user, await cookies());

    redirect("/");
}

export async function oAuthSignIn(provider: OAuthProvider) {
    const oAuthClient = getOAuthClient(provider);
    redirect(oAuthClient.createAuthUrl(await cookies()));
}

export async function signOutAction(): Promise<TypedResponse<{}>> {
    const cookieStore = await cookies();
    removeSession({
        delete: (name: string) => {
            cookieStore.delete(name);
        },
    });
    redirect("/sign-in");
}

export async function getAuth(): Promise<AuthState> {
    const fullUser = await getCurrentUser({
        withFullUser: true,
    });
    if (!fullUser) return { isAuthenticated: false, session: null };

    const userCredentials = await db.query.UserCredentialsTable.findFirst({
        where: eq(UserCredentialsTable.userId, fullUser.id),
        columns: { expiresAt: true },
    });

    return {
        isAuthenticated: true,
        session: {
            user: fullUser,
            hasPassword: !!(
                userCredentials &&
                (!userCredentials.expiresAt || userCredentials.expiresAt > new Date())
            ),
        },
    };
}
