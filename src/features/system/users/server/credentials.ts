import { UserCredentialsTable } from "@/drizzle/schema";
import {
  generateSalt,
  hashPassword,
} from "@/features/core/auth/core/passwordHasher";

import type { UsersDb } from "./shared";

/**
 * Sets (or replaces) a user's sign-in password.
 *
 * Upserts on the `user_credentials_user_id_unique` index so the same call
 * covers both "new account gets its first password" and "admin resets an
 * existing password". Each call generates a fresh salt.
 */
export async function setUserPassword(
  db: UsersDb,
  userId: string,
  password: string,
) {
  const passwordSalt = generateSalt();
  const passwordHash = await hashPassword(password, passwordSalt);
  const now = new Date();

  await db
    .insert(UserCredentialsTable)
    .values({
      userId,
      passwordHash,
      passwordSalt,
      mustChangePassword: false,
      lastChangedAt: now,
    })
    .onConflictDoUpdate({
      target: UserCredentialsTable.userId,
      set: {
        passwordHash,
        passwordSalt,
        mustChangePassword: false,
        lastChangedAt: now,
        updatedAt: now,
      },
    });
}
