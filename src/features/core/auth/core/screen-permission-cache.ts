import { redisClient } from "@/integrations/redis";
import type { ScreenPermissionMap } from "./screen-permission-map";

/**
 * A Redis mirror of `user_screen_permissions`, keyed by **user id**.
 *
 * The proxy runs before any database work and only needs a yes/no on one screen,
 * so it reads this instead of querying Postgres on every navigation. Keying by
 * user rather than by session is what makes revocation possible at all: sessions
 * are stored under an opaque session id with no user→sessions index, so an admin
 * cannot rewrite someone else's session — but they can overwrite this key from
 * their own request.
 *
 * The database stays authoritative. Everything with a `ctx.db` (tRPC, server
 * components) reads Postgres directly, so a mirror that drifts — because rows
 * were changed via `db:studio`, raw SQL, or the seed CLI — can only affect the
 * proxy's optimistic check, which the layout gate backstops.
 */

/** Matches the session TTL so the two expire together. */
const SCREEN_PERMISSIONS_TTL_SECONDS = 60 * 60 * 24 * 7;

export function screenPermissionsKey(userId: string) {
  return `user-screen-permissions:${userId}` as const;
}

/**
 * `null` means "cache miss — unknown". `{}` means "known to have no rows".
 *
 * The distinction matters: `{}` is a positive assertion the caller can act on,
 * while `null` tells the permission engine to fall back to role defaults.
 */
export async function readScreenPermissionsCache(
  userId: string,
): Promise<ScreenPermissionMap | null> {
  try {
    const cached = await redisClient.get<ScreenPermissionMap>(
      screenPermissionsKey(userId),
    );
    return cached ?? null;
  } catch {
    // A Redis blip must not lock everyone out of the app; the layout gate and
    // the tRPC resolvers both re-check against the database.
    return null;
  }
}

export async function writeScreenPermissionsCache(
  userId: string,
  map: ScreenPermissionMap,
): Promise<void> {
  await redisClient.set(screenPermissionsKey(userId), map, {
    ex: SCREEN_PERMISSIONS_TTL_SECONDS,
  });
}

export async function clearScreenPermissionsCache(
  userId: string,
): Promise<void> {
  await redisClient.del(screenPermissionsKey(userId));
}
