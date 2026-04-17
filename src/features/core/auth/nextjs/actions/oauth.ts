"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/drizzle";
import { getCurrentUser } from "@/features/core/auth/nextjs/currentUser";
import {
    type OAuthProvider,
    oAuthProviderValues,
    UserCredentialsTable,
    UserOAuthAccountsTable,
} from "@/features/core/auth/tables";
import type {
    OAuthConnection,
    TypedResponse,
} from "@/features/core/auth/types";
import { getT } from "@/features/core/i18n/actions";

const providerSchema = z.enum(oAuthProviderValues);

export async function listOAuthConnectionsAction(): Promise<
    TypedResponse<{ data: OAuthConnection[] }>
> {
    const { id: userId } = await getCurrentUser({ redirectIfNotFound: true });

    const accounts = await db.query.UserOAuthAccountsTable.findMany({
        columns: { provider: true, providerAccountId: true, createdAt: true },
        where: eq(UserOAuthAccountsTable.userId, userId),
    });

    const connectedMap = new Map<OAuthProvider, (typeof accounts)[number]>();
    for (const account of accounts) connectedMap.set(account.provider, account);

    const providerSet = new Set<OAuthProvider>(oAuthProviderValues);
    for (const account of accounts) providerSet.add(account.provider);

    const result: OAuthConnection[] = Array.from(providerSet).map((provider) => ({
        provider,
        displayName: provider,
        connected: connectedMap.has(provider),
        connectedAt: connectedMap.get(provider)?.createdAt ?? null,
    }));

    return { isError: false, data: result };
}

export async function disconnectOAuthAccountAction(
    rawInput: z.infer<typeof providerSchema>,
): Promise<TypedResponse<{ disconnected: true }>> {
    const { t } = await getT();
    const { id: userId } = await getCurrentUser({ redirectIfNotFound: true });

    const parsed = providerSchema.safeParse(rawInput);

    if (!parsed.success) {
        return {
            isError: true,
            message: t("authTranslations.error.badRequest"),
        };
    }

    const provider = parsed.data;

    const account = await db.query.UserOAuthAccountsTable.findFirst({
        columns: { providerAccountId: true },
        where: and(
            eq(UserOAuthAccountsTable.userId, userId),
            eq(UserOAuthAccountsTable.provider, provider),
        ),
    });

    if (!account) {
        return {
            isError: true,
            message: t("authTranslations.oauth.connections.notLinked"),
        };
    }

    const [credentialCountRows, providerCountRows] = await Promise.all([
        db
            .select({ count: sql<number>`count(1)::int` })
            .from(UserCredentialsTable)
            .where(eq(UserCredentialsTable.userId, userId)),
        db
            .select({ count: sql<number>`count(1)::int` })
            .from(UserOAuthAccountsTable)
            .where(eq(UserOAuthAccountsTable.userId, userId)),
    ]);

    const hasPassword = Number(credentialCountRows[0]?.count ?? 0) > 0;
    const totalProviders = Number(providerCountRows[0]?.count ?? 0);

    if (!hasPassword && totalProviders <= 1) {
        return {
            isError: true,
            message: t("authTranslations.oauth.connections.onlyMethod"),
        };
    }

    await db
        .delete(UserOAuthAccountsTable)
        .where(
            and(
                eq(UserOAuthAccountsTable.userId, userId),
                eq(UserOAuthAccountsTable.provider, provider),
            ),
        );

    revalidatePath("/");

    return { isError: false, disconnected: true };
}
