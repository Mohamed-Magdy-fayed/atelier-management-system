import { and, DrizzleError, eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/drizzle";
import {
  type OAuthProvider,
  oAuthProviderValues,
  UserOAuthAccountsTable,
  UsersTable,
} from "@/drizzle/schema";
import {
  createUserSession,
  getOAuthClient,
  getUserSession,
  normalizeEmail,
} from "@/features/core/auth/core";
import { getUserIdTag } from "@/features/core/auth/db-cache";
import { getPostAuthRedirect } from "@/features/core/auth/nextjs/lib/post-auth-redirect";
import type { PartialUser } from "@/features/core/auth/types";

const OAUTH_POPUP_MODE_COOKIE = "oAuthPopupMode";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const cookieJar = await cookies();
  const isPopupConnect =
    cookieJar.get(OAUTH_POPUP_MODE_COOKIE)?.value === "connect";
  const { provider: rawProvider } = await params;
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const { success, data: provider } = z
    .enum(oAuthProviderValues)
    .safeParse(rawProvider);

  if (typeof code !== "string" || typeof state !== "string" || !success) {
    if (isPopupConnect) {
      cookieJar.delete(OAUTH_POPUP_MODE_COOKIE);
      redirect(getOAuthCompleteUrl({ status: "error" }));
    }

    redirect(
      `/sign-in?oauthError=${encodeURIComponent(
        "Failed to connect. Please try again.",
      )}`,
    );
  }

  const currentSession = await getUserSession(cookieJar);
  const oAuthClient = getOAuthClient(provider);
  let oAuthErrorMessage: string | null = null;
  let authenticatedUser: PartialUser | null = null;

  try {
    const oAuthUser = await oAuthClient.fetchUser(code, state, cookieJar);
    let user: PartialUser | null = null;

    if (currentSession?.user.id) {
      user = await connectUserToAccount(oAuthUser, provider, {
        currentUserId: currentSession.user.id,
      });
    } else {
      const existingUser = await db.query.UserOAuthAccountsTable.findFirst({
        where: eq(UserOAuthAccountsTable.providerAccountId, oAuthUser.id),
      });

      user = await connectUserToAccount(oAuthUser, provider, {
        currentUserId: existingUser?.userId,
      });
    }

    await createUserSession(user, cookieJar);
    authenticatedUser = user;
  } catch (error) {
    console.error(error);

    oAuthErrorMessage =
      error instanceof Error || error instanceof DrizzleError
        ? error.message || "Failed to connect. Please try again."
        : "Failed to connect. Please try again.";

    // store error in a cookie so client pages (including pages behind auth) can display it
    try {
      cookieJar.set("oauthError", oAuthErrorMessage);
    } catch {}
  }

  cookieJar.delete(OAUTH_POPUP_MODE_COOKIE);

  if (oAuthErrorMessage) {
    if (isPopupConnect) {
      redirect(
        getOAuthCompleteUrl({
          status: "error",
          provider,
          message: oAuthErrorMessage,
        }),
      );
    }

    redirect(`/sign-in?oauthError=${encodeURIComponent(oAuthErrorMessage)}`);
  }

  revalidateTag(getUserIdTag(currentSession?.user.id || ""), "max");

  if (isPopupConnect) {
    redirect(getOAuthCompleteUrl({ status: "success", provider }));
  }

  if (!authenticatedUser) {
    redirect("/sign-in");
  }

  redirect(getPostAuthRedirect(authenticatedUser));
}

function getOAuthCompleteUrl({
  status,
  provider,
  message,
}: {
  status: "success" | "error";
  provider?: OAuthProvider;
  message?: string;
}) {
  const searchParams = new URLSearchParams({ status });

  if (provider) {
    searchParams.set("provider", provider);
  }

  if (message) {
    searchParams.set("message", message);
  }

  return `/oauth/complete?${searchParams.toString()}`;
}

type ConnectOptions = { currentUserId?: string };

function connectUserToAccount(
  {
    id,
    email,
    name,
    imageUrl,
  }: { id: string; email: string; name: string; imageUrl?: string },
  provider: OAuthProvider,
  options: ConnectOptions = {},
): Promise<PartialUser> {
  return db.transaction(async (trx) => {
    const normalizedEmail = normalizeEmail(email);
    const existingUser = options.currentUserId
      ? await trx.query.UsersTable.findFirst({
          columns: {
            id: true,
            role: true,
            name: true,
            email: true,
            phone: true,
            imageUrl: true,
            emailVerifiedAt: true,
          },
          where: eq(UsersTable.id, options.currentUserId),
        })
      : await trx.query.UsersTable.findFirst({
          columns: {
            id: true,
            role: true,
            name: true,
            email: true,
            phone: true,
            imageUrl: true,
            emailVerifiedAt: true,
          },
          where: eq(UsersTable.email, normalizedEmail),
        });

    let user: PartialUser | null = existingUser ?? null;

    if (user == null) {
      const [newUser] = await trx
        .insert(UsersTable)
        .values({
          name,
          email: normalizedEmail,
          emailVerifiedAt: new Date(),
          role: "customer",
          createdBy: "oauth",
          imageUrl,
        })
        .returning({
          id: UsersTable.id,
          role: UsersTable.role,
          name: UsersTable.name,
          email: UsersTable.email,
          phone: UsersTable.phone,
          imageUrl: UsersTable.imageUrl,
          emailVerifiedAt: UsersTable.emailVerifiedAt,
        });

      if (newUser == null) {
        throw new Error("Unable to create user from OAuth profile");
      }

      user = newUser;
    } else {
      const existingAccount = await trx.query.UserOAuthAccountsTable.findFirst({
        columns: { userId: true },
        where: and(
          eq(UserOAuthAccountsTable.provider, provider),
          eq(UserOAuthAccountsTable.providerAccountId, id),
        ),
      });

      if (existingAccount && existingAccount.userId !== user.id) {
        throw new Error("This OAuth account is already linked to another user");
      }

      await trx
        .update(UsersTable)
        .set({ emailVerifiedAt: new Date() })
        .where(eq(UsersTable.id, user.id));
    }

    await trx
      .insert(UserOAuthAccountsTable)
      .values({ provider, providerAccountId: id, userId: user.id })
      .onConflictDoNothing();

    if (user == null) {
      throw new Error("Unable to resolve user from OAuth profile");
    }

    return user;
  });
}
