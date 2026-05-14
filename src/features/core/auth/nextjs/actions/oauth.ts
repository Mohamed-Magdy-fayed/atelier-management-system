"use server";

import { and, eq, sql } from "drizzle-orm";
import { cacheTag } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";

import { db } from "@/drizzle";
import {
  type OAuthProvider,
  oAuthProviderValues,
  UserCredentialsTable,
  UserOAuthAccountsTable,
} from "@/drizzle/schema";
import { getOAuthClient } from "@/features/core/auth/core";
import {
  getUserIdTag,
  revalidateAuthCache,
} from "@/features/core/auth/db-cache";
import { getCurrentUser } from "@/features/core/auth/nextjs/currentUser";
import type {
  OAuthConnection,
  TypedResponse,
} from "@/features/core/auth/types";
import { getT } from "@/features/core/i18n/server";

const providerSchema = z.enum(oAuthProviderValues);
const OAUTH_POPUP_MODE_COOKIE = "oAuthPopupMode";

export async function listOAuthConnectionsAction(): Promise<
  TypedResponse<{ connections: OAuthConnection[] }>
> {
  const { id: userId } = await getCurrentUser({ redirectIfNotFound: true });

  const connections = await getUserOAuthConnections(userId);
  return { isError: false, connections };
}

async function getUserOAuthConnections(userId: string) {
  "use cache";
  cacheTag(getUserIdTag(userId));

  const accounts = await db.query.UserOAuthAccountsTable.findMany({
    columns: { provider: true, providerAccountId: true, createdAt: true },
    where: eq(UserOAuthAccountsTable.userId, userId),
  });

  const connectedMap = new Map<OAuthProvider, (typeof accounts)[number]>();
  for (const account of accounts) connectedMap.set(account.provider, account);

  const providerSet = new Set<OAuthProvider>(oAuthProviderValues);
  for (const account of accounts) providerSet.add(account.provider);

  return Array.from(providerSet).map((provider) => ({
    provider,
    displayName: provider,
    connected: connectedMap.has(provider),
    connectedAt: connectedMap.get(provider)?.createdAt ?? null,
  }));
}

export async function getOAuthConnectUrlAction(
  rawInput: z.infer<typeof providerSchema>,
): Promise<TypedResponse<{ url: string }>> {
  const { t } = await getT();
  await getCurrentUser({ redirectIfNotFound: true });

  const parsed = providerSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      isError: true,
      message: t("authTranslations.error.badRequest"),
    };
  }

  const cookieStore = await cookies();
  cookieStore.set(OAUTH_POPUP_MODE_COOKIE, "connect", {
    secure: true,
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 10,
    path: "/",
  });

  const oAuthClient = getOAuthClient(parsed.data);
  return {
    isError: false,
    url: oAuthClient.createAuthUrl(cookieStore),
  };
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

  revalidateAuthCache({ id: userId, branchId: "" });
  return { isError: false, disconnected: true };
}
