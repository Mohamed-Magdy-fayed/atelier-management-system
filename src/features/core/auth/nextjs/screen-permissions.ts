import { cacheTag } from "next/cache";

import { db } from "@/drizzle";
import type { ScreenPermissionMap } from "@/features/core/auth/core/screen-permission-map";
import { getUserIdTag } from "@/features/core/auth/db-cache";
import { loadScreenPermissionMap } from "@/features/system/users/server/screen-permissions";

/**
 * A user's screen grants for server rendering.
 *
 * Tagged with the existing `getUserIdTag`, so `revalidateAuthCache({ id })` —
 * already called wherever a user record changes — busts this too, with no new
 * tag plumbing.
 *
 * Takes `userId` as an argument and never reads `cookies()`, which
 * `cacheComponents` requires of any `"use cache"` function.
 */
export async function getUserScreenPermissionsCached(
  userId: string,
): Promise<ScreenPermissionMap> {
  "use cache";
  cacheTag(getUserIdTag(userId));

  return loadScreenPermissionMap(db, userId);
}
