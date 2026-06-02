"use server";

import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/drizzle";
import {
  type OAuthProvider,
  type User,
  UserCredentialsTable,
  UsersTable,
} from "@/drizzle/schema";
import { getOAuthClient } from "@/features/core/auth/core";
import { authError, normalizeEmail } from "@/features/core/auth/core/helpers";
import {
  comparePasswords,
  generateSalt,
  hashPassword,
} from "@/features/core/auth/core/passwordHasher";
import {
  createUserSession,
  removeUserFromSession,
} from "@/features/core/auth/core/session";
import { validateInput } from "@/features/core/auth/nextjs/actions/helpers";
import { getCurrentUser } from "@/features/core/auth/nextjs/currentUser";
import { getPostAuthRedirect } from "@/features/core/auth/nextjs/lib/post-auth-redirect";
import { signInSchema, signUpSchema } from "@/features/core/auth/schemas";
import type {
  AuthState,
  PartialUser,
  TypedResponse,
} from "@/features/core/auth/types";
import { getT } from "@/features/core/i18n/server";

export async function signInAction(
  rawInput: unknown,
): Promise<TypedResponse<{ user: PartialUser }>> {
  const { t } = await getT();
  const { password, email } = await validateInput(signInSchema, rawInput);

  const normalizedEmail = normalizeEmail(email);
  let signedInUser: PartialUser | null = null;

  try {
    const user = await db.query.UsersTable.findFirst({
      columns: { id: true, role: true },
      where: eq(UsersTable.email, normalizedEmail),
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

    await createUserSession(user, await cookies());
    signedInUser = user;
  } catch (error) {
    return authError(error);
  }

  if (!signedInUser) {
    return {
      isError: true,
      message: t("authTranslations.error.credentials"),
    };
  }

  redirect(getPostAuthRedirect(signedInUser));
}

export async function signUpAction(
  rawData: unknown,
): Promise<TypedResponse<{ user: Pick<User, "id" | "name" | "role"> }>> {
  const { t } = await getT();
  const { email, name, password, phone } = await validateInput(
    signUpSchema,
    rawData,
  );

  const normalizedEmail = normalizeEmail(email);

  const result: TypedResponse<{ user: Pick<User, "id" | "name" | "role"> }> =
    await db.transaction(async (trx) => {
      const existing = await trx.query.UsersTable.findFirst({
        columns: { id: true },
        where: eq(UsersTable.email, normalizedEmail),
      });

      if (existing) {
        throw new Error(t("authTranslations.signUp.error.duplicate"));
      }

      const salt = generateSalt();
      const passwordHash = await hashPassword(password, salt);

      const [user] = await trx
        .insert(UsersTable)
        .values({
          name,
          email: normalizedEmail,
          phone,
          role: "customer",
          createdBy: "self-signup",
        })
        .returning({
          id: UsersTable.id,
          name: UsersTable.name,
          role: UsersTable.role,
        });

      if (!user) {
        throw new Error(t("authTranslations.signUp.error.generic"));
      }

      await trx.insert(UserCredentialsTable).values({
        userId: user.id,
        passwordHash,
        passwordSalt: salt,
      });

      return { isError: false, user };
    });

  await createUserSession(result.user, await cookies());

  const { linkRentalCustomersToUser } = await import(
    "@/features/customer-portal/server/link-rental-customers"
  );
  await linkRentalCustomersToUser(result.user.id);

  redirect(getPostAuthRedirect(result.user));
}

export async function oAuthSignIn(provider: OAuthProvider) {
  const oAuthClient = getOAuthClient(provider);
  redirect(oAuthClient.createAuthUrl(await cookies()));
}

export async function signOutAction(): Promise<TypedResponse<void>> {
  const cookieStore = await cookies();
  await removeUserFromSession(cookieStore);
  redirect("/sign-in");
}

export async function getAuth(): Promise<AuthState> {
  const user = await getCurrentUser({ withFullUser: true });
  if (!user) return { isAuthenticated: false, session: null };

  const userCredentials = await db.query.UserCredentialsTable.findFirst({
    where: eq(UserCredentialsTable.userId, user.id),
    columns: { expiresAt: true },
  });

  return {
    isAuthenticated: true,
    session: {
      user,
      hasPassword: !!(
        userCredentials &&
        (!userCredentials.expiresAt || userCredentials.expiresAt > new Date())
      ),
    },
  };
}
