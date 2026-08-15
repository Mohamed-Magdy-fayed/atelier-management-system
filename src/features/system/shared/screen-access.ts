import { TRPCError } from "@trpc/server";

import {
  hasPermission,
  type ScreenAction,
} from "@/features/core/auth/core/permissions";
import {
  getEntityRegistryItem,
  type ScreenKey,
} from "@/features/system/registry";

import type { ProtectedTRPCSession, TRPCContext } from "./staff-access";

/**
 * Per-user screen/action authorization for tRPC resolvers.
 *
 * A sibling of `staff-access.ts` rather than an extension of it: that file is a
 * hot import across seven features and is entirely branch/role logic, and the
 * screen concern has different dependencies.
 *
 * These checks are **additive**. `assertOperationalStaff`, `assertAdminRole` and
 * the branch guards all still run — a `delete` grant never promotes an employee
 * past them, and the admin-only screens (branches, settings, employees) are not
 * reachable through this at all.
 */

export async function canScreenAction(
  ctx: TRPCContext,
  session: ProtectedTRPCSession,
  screenKey: ScreenKey,
  action: ScreenAction,
): Promise<boolean> {
  // Admins are unrestricted, and short-circuiting here skips the query entirely.
  if (session.user.role === "admin") return true;

  const screenPermissions = await ctx.loadScreenPermissions();

  return hasPermission({ ...session.user, screenPermissions }, "screens", action, {
    screenKey,
  });
}

/** Throws FORBIDDEN unless this actor may perform `action` on `screenKey`. */
export async function assertScreenPermission(
  ctx: TRPCContext,
  session: ProtectedTRPCSession,
  screenKey: ScreenKey,
  action: ScreenAction,
): Promise<void> {
  if (await canScreenAction(ctx, session, screenKey, action)) return;

  throw new TRPCError({
    code: "FORBIDDEN",
    message: ctx.t("systemPages.screenPermissionDenied"),
  });
}

/**
 * Same check, for resolvers whose target screen comes from the payload — the
 * import pipeline, where one procedure serves every entity.
 *
 * An unknown slug is refused rather than waved through: silently skipping the
 * check is how a new entity ends up unguarded.
 */
export async function assertScreenPermissionForEntitySlug(
  ctx: TRPCContext,
  session: ProtectedTRPCSession,
  slug: string,
  action: ScreenAction,
): Promise<void> {
  const entity = getEntityRegistryItem(slug);

  if (!entity) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: ctx.t("systemPages.screenPermissionDenied"),
    });
  }

  await assertScreenPermission(ctx, session, entity.screenKey, action);
}
