import { eq } from "drizzle-orm";

import { db } from "@/drizzle";
import { UserCredentialsTable, UsersTable } from "@/drizzle/schema";
import { hashPassword } from "@/features/core/auth/core/passwordHasher";

import {
  SEED_ADMIN_EMAIL,
  SEED_ADMIN_ID,
  SEED_ADMIN_PASSWORD,
  SEED_SYSTEM_ACTOR,
} from "../constants";

/**
 * Seeds exactly one admin account and nothing else.
 *
 * The other profiles reset the database and fabricate branches, dresses,
 * employees and customers. This one is for bootstrapping a real, empty
 * environment: sign in, then build the data through the app or the CSV import.
 * It never clears anything and is safe to re-run.
 *
 * The app degrades gracefully with zero branches — `getBranches` returns an
 * empty list and no active branch — so branches can be created or imported
 * afterwards.
 */
export async function seedAdminProfile() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? SEED_ADMIN_EMAIL)
    .trim()
    .toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? SEED_ADMIN_PASSWORD;

  const existing = await db.query.UsersTable.findFirst({
    where: eq(UsersTable.email, email),
    columns: { id: true, role: true, deletedAt: true },
  });

  if (existing && existing.role !== "admin") {
    throw new Error(
      `A non-admin account already uses ${email}. Refusing to change its role.`,
    );
  }

  let userId = existing?.id;

  if (!userId) {
    const [inserted] = await db
      .insert(UsersTable)
      .values({
        // A fixed id keeps re-runs and cross-environment references stable.
        id: SEED_ADMIN_ID,
        createdBy: SEED_SYSTEM_ACTOR,
        email,
        emailVerifiedAt: new Date(),
        name: "System Administrator",
        role: "admin",
      })
      .returning({ id: UsersTable.id });

    userId = inserted?.id;
    console.info("Created admin user %s", email);
  } else {
    // A previously soft-deleted admin would be unable to sign in.
    if (existing?.deletedAt) {
      await db
        .update(UsersTable)
        .set({ deletedAt: null, deletedBy: null, updatedBy: SEED_SYSTEM_ACTOR })
        .where(eq(UsersTable.id, userId));
      console.info("Restored soft-deleted admin user %s", email);
    } else {
      console.info("Admin user %s already exists — left as is.", email);
    }
  }

  if (!userId) {
    throw new Error("Could not resolve the admin user id.");
  }

  const credential = await db.query.UserCredentialsTable.findFirst({
    where: eq(UserCredentialsTable.userId, userId),
    columns: { userId: true },
  });

  if (credential) {
    // Silently rotating a password on a re-run would lock out whoever is
    // already using this account. Rotation has to be asked for.
    if (process.env.SEED_ADMIN_RESET_PASSWORD === "1") {
      await db
        .update(UserCredentialsTable)
        .set({
          passwordHash: await hashPassword(password, userId),
          passwordSalt: userId,
          lastChangedAt: new Date(),
        })
        .where(eq(UserCredentialsTable.userId, userId));
      console.info("Reset the admin password.");
    } else {
      console.info(
        "Admin already has a password — left unchanged. Set SEED_ADMIN_RESET_PASSWORD=1 to rotate it.",
      );
    }
  } else {
    await db.insert(UserCredentialsTable).values({
      userId,
      passwordHash: await hashPassword(password, userId),
      passwordSalt: userId,
    });
    console.info("Set the admin password.");
  }

  return {
    profile: "admin" as const,
    adminUserId: userId,
    adminEmail: email,
    seededCustomerCount: 0,
    seededEmployees: [] as Array<{ id: string }>,
  };
}
