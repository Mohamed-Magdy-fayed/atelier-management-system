import { eq } from "drizzle-orm";
import { cacheTag } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/drizzle";
import { type User, UsersTable } from "@/drizzle/schema";
import { getUserSession } from "@/features/core/auth/core";
import { getUserIdTag } from "@/features/core/auth/db-cache";
import type { PartialUser } from "@/features/core/auth/types";

function _getCurrentUser(options: {
  withFullUser: true;
  redirectIfNotFound: true;
}): Promise<User>;
function _getCurrentUser(options: {
  withFullUser: true;
  redirectIfNotFound?: false;
}): Promise<User | null>;
function _getCurrentUser(options: {
  withFullUser?: false;
  redirectIfNotFound: true;
}): Promise<PartialUser>;
function _getCurrentUser(options?: {
  withFullUser?: false;
  redirectIfNotFound?: false;
}): Promise<PartialUser | null>;
async function _getCurrentUser({
  withFullUser = false,
  redirectIfNotFound = false,
} = {}) {
  const cookieStore = await cookies();
  const session = await getUserSession(cookieStore);
  if (session?.user == null) {
    if (redirectIfNotFound) return redirect("/sign-in");
    return null;
  }

  if (withFullUser) {
    const fullUser = await getUserFromDb(session.user.id);
    // This should never happen
    if (fullUser == null) throw new Error("User not found in database");
    return fullUser;
  }

  return session.user;
}

export const getCurrentUser = _getCurrentUser;

async function getUserFromDb(id: string) {
  "use cache";
  cacheTag(getUserIdTag(id));

  return db
    .select()
    .from(UsersTable)
    .where(eq(UsersTable.id, id))
    .then((results) => results[0]);
}
