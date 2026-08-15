import type { ScreenKey } from "@/features/system/registry";

/**
 * Shared vocabulary for per-user screen grants.
 *
 * Deliberately a leaf module with no runtime imports: it is pulled into the
 * proxy bundle, which must not drag in drizzle or the Redis client.
 */

export type ScreenAction = "view" | "create" | "update" | "delete";

export const SCREEN_ACTIONS = [
  "view",
  "create",
  "update",
  "delete",
] as const satisfies readonly ScreenAction[];

/**
 * A user's explicit grants.
 *
 * `null`/`undefined` means "we have no rows for this user" — fall back to the
 * role defaults. A **present** map is exhaustive: a screen it does not list is
 * denied. That asymmetry is what lets an admin grant three screens without
 * having to deny the rest one by one.
 */
export type ScreenPermissionMap = Partial<Record<ScreenKey, ScreenAction[]>>;
