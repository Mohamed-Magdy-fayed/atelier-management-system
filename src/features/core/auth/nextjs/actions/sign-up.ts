"use server";

import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { z } from "zod";

import { db } from "@/drizzle";
import { UserCredentialsTable, UsersTable } from "@/drizzle/schema";
import {
    createUserSession,
    generateSalt,
    hashPassword,
    normalizeEmail,
} from "@/features/core/auth/core";
import { validateInput } from "@/features/core/auth/nextjs/actions/helpers";
import {
    customerDetailsStepSchema,
    customerOtpStepSchema,
    customerPhoneStepSchema,
} from "@/features/core/auth/schemas";
import { getT } from "@/features/core/i18n/server";
import {
    assertPhoneVerified,
    sendPhoneOtp,
    verifyPhoneOtp,
} from "@/integrations/whatsapp/otp";

export async function validateUserExists(phone: string) {
    const { t } = await getT();
    const exists = await db.query.UsersTable.findFirst({
        where: (table, { eq }) => eq(table.phone, phone),
        columns: { id: true },
    });

    if (exists) {
        throw new Error(t("authTranslations.signUp.error.duplicate"));
    }
}

export async function sendSignUpOtpAction(
    rawInput: z.infer<typeof customerPhoneStepSchema>,
) {
    const { phone } = await validateInput(customerPhoneStepSchema, rawInput);

    await validateUserExists(phone);
    await sendPhoneOtp(phone);

    const params = new URLSearchParams();
    params.set("phone", phone);

    redirect(`/sign-up?${params.toString()}`);
}

export async function verifySignUpOtpAction(
    rawInput: z.infer<typeof customerOtpStepSchema>,
) {
    const { phone, otp } = await validateInput(customerOtpStepSchema, rawInput);
    await validateUserExists(phone);
    const result = await verifyPhoneOtp(phone, otp);

    const params = new URLSearchParams();
    params.set("phone", phone);
    params.set("vid", result.verificationId);

    await createUser(phone);

    redirect(`/sign-up?${params.toString()}`);
}

export async function completeSignUpAction(input: unknown) {
    const { t } = await getT();

    try {
        const { email, name, password, phone, verificationId } =
            await validateInput(customerDetailsStepSchema, input);
        await assertPhoneVerified(phone, verificationId);

        const normalizedEmail = email ? normalizeEmail(email) : undefined;

        const user = await db.transaction(async (trx) => {
            if (normalizedEmail) {
                const existing = await trx.query.UsersTable.findFirst({
                    columns: { id: true },
                    where: (table, { eq }) => eq(table.email, normalizedEmail),
                });

                if (existing) {
                    throw new Error(t("authTranslations.signUp.error.duplicate"));
                }
            }

            const salt = generateSalt();
            const passwordHash = await hashPassword(password, salt);

            const user = await trx
                .update(UsersTable)
                .set({
                    name: name,
                    email,
                })
                .where(eq(UsersTable.phone, phone))
                .returning({
                    id: UsersTable.id,
                    phone: UsersTable.phone,
                    email: UsersTable.email,
                    name: UsersTable.name,
                    role: UsersTable.role,
                })
                .then((res) => res[0]);

            await trx.insert(UserCredentialsTable).values({
                userId: user.id,
                passwordHash,
                passwordSalt: salt,
            });

            return user;
        });

        await createUserSession(user, await cookies());
    } catch (error) {
        console.error("Error validating sign-up input", error);
    }

    redirect("/");
}

async function createUser(phone: string) {
    db.insert(UsersTable).values({
        createdBy: "sign-up",
        phone,
        phoneVerifiedAt: new Date(),
        role: "customer",
    });
}
