import "server-only";

import { getUserScreenPermissionsCached } from "@/features/core/auth/nextjs/screen-permissions";
import type { PartialUser } from "@/features/core/auth/types";

import { getPostAuthRedirect } from "./post-auth-redirect";

/**
 * Post-auth destination for sign-in paths, which only hold a session payload.
 *
 * Without loading the grants first, an employee restricted to (say) Dresses
 * would be sent to `/reservations`, the proxy would rewrite that to
 * `/unauthorized`, and signing in would look like it failed. Every sign-in entry
 * point — password, passkey, OAuth — must use this, not the sync version.
 *
 * Kept in its own `server-only` module rather than alongside
 * `getPostAuthRedirect`: that file is reachable from client components through
 * `getPublicAccountDestination`, and importing the database loader there pulls
 * drizzle into the browser bundle.
 */
export async function resolvePostAuthRedirect(user: PartialUser) {
  if (user.role !== "employee") return getPostAuthRedirect(user);

  const screenPermissions = await getUserScreenPermissionsCached(user.id);
  return getPostAuthRedirect({ ...user, screenPermissions });
}
