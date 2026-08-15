import { eq } from "drizzle-orm";

import { UserScreenPermissionsTable } from "@/drizzle/schema";
import {
  SCREEN_ACTIONS,
  type ScreenAction,
  type ScreenPermissionMap,
} from "@/features/core/auth/core/screen-permission-map";
import {
  isGrantableScreenKey,
  type ScreenKey,
} from "@/features/system/registry";

import type { TRPCContext, UsersDb } from "./shared";

/**
 * Reads a user's explicit grants as the shape the permission engine consumes.
 *
 * Returns `{}` when the user has no rows — meaning "fall back to role defaults".
 * Rows whose screen is no longer grantable (a screen was removed, or moved back
 * to admin-only) are dropped rather than trusted, so stale data can never widen
 * access beyond what the current registry allows.
 */
export async function loadScreenPermissionMap(
  db: UsersDb,
  userId: string,
): Promise<ScreenPermissionMap> {
  const rows = await db
    .select({
      screenKey: UserScreenPermissionsTable.screenKey,
      canView: UserScreenPermissionsTable.canView,
      canCreate: UserScreenPermissionsTable.canCreate,
      canUpdate: UserScreenPermissionsTable.canUpdate,
      canDelete: UserScreenPermissionsTable.canDelete,
    })
    .from(UserScreenPermissionsTable)
    .where(eq(UserScreenPermissionsTable.userId, userId));

  const map: ScreenPermissionMap = {};

  for (const row of rows) {
    if (!isGrantableScreenKey(row.screenKey)) continue;

    const actions: ScreenAction[] = [];
    if (row.canView) actions.push("view");
    if (row.canCreate) actions.push("create");
    if (row.canUpdate) actions.push("update");
    if (row.canDelete) actions.push("delete");

    // An all-false row grants nothing and would only make the map "present"
    // (and therefore exhaustive) for no reason. Skip it.
    if (actions.length === 0) continue;

    map[row.screenKey] = actions;
  }

  return map;
}

export async function getUserScreenPermissions(
  ctx: TRPCContext,
  userId: string,
): Promise<ScreenPermissionMap> {
  return loadScreenPermissionMap(ctx.db, userId);
}

/** Keeps only grantable screens and real actions, dropping empty grants. */
function normalizeScreenPermissionMap(
  map: ScreenPermissionMap,
): { screenKey: ScreenKey; actions: ScreenAction[] }[] {
  const entries: { screenKey: ScreenKey; actions: ScreenAction[] }[] = [];

  for (const [screenKey, actions] of Object.entries(map)) {
    if (!isGrantableScreenKey(screenKey)) continue;

    const granted = SCREEN_ACTIONS.filter((action) =>
      (actions ?? []).includes(action),
    );

    if (granted.length === 0) continue;
    entries.push({ screenKey, actions: granted });
  }

  return entries;
}

/**
 * Replaces a user's grants with `map`. Call inside a transaction.
 *
 * A full delete-then-insert rather than a diff: the row count is at most one per
 * grantable screen, so there is nothing to optimise, and "replace" is the only
 * semantics the matrix UI can express.
 *
 * An empty result deletes every row, returning the account to its role defaults
 * rather than denying everything — otherwise an admin who cleared the matrix by
 * mistake would have bricked the account with no way back through the UI.
 * "Deny absolutely everything" is deliberately not expressible here; soft-delete
 * the user for that.
 *
 * Returns the map as stored, for the caller to mirror into Redis.
 */
export async function syncUserScreenPermissions(
  db: UsersDb,
  userId: string,
  map: ScreenPermissionMap,
): Promise<ScreenPermissionMap> {
  const entries = normalizeScreenPermissionMap(map);

  await db
    .delete(UserScreenPermissionsTable)
    .where(eq(UserScreenPermissionsTable.userId, userId));

  if (entries.length === 0) return {};

  await db.insert(UserScreenPermissionsTable).values(
    entries.map(({ screenKey, actions }) => ({
      userId,
      screenKey,
      canView: actions.includes("view"),
      canCreate: actions.includes("create"),
      canUpdate: actions.includes("update"),
      canDelete: actions.includes("delete"),
    })),
  );

  return Object.fromEntries(
    entries.map(({ screenKey, actions }) => [screenKey, actions]),
  ) as ScreenPermissionMap;
}
