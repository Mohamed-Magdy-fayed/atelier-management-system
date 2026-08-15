import { hasPermission } from "@/features/core/auth/core/permissions";
import type { PartialUser } from "@/features/core/auth/types";
import { SYSTEM_NAV_ITEMS } from "@/features/system/registry";

const EMPLOYEE_HOME_HREF = "/reservations";

/**
 * Where to send a user right after authenticating.
 *
 * Sync, and deliberately free of any server-only import: client components
 * reach this through `getPublicAccountDestination`, and they already hold a user
 * carrying `screenPermissions`. The sign-in paths do **not** — they only have
 * the session payload — so they use `resolvePostAuthRedirect` from the
 * server-only sibling module instead.
 */
export function getPostAuthRedirect(user: PartialUser) {
  if (user.role === "customer") {
    return "/my-account";
  }

  if (
    user.role === "employee" &&
    hasPermission(user, "screens", "view", { screenKey: "reservations" })
  ) {
    return EMPLOYEE_HOME_HREF;
  }

  return (
    SYSTEM_NAV_ITEMS.find((item) =>
      hasPermission(user, "screens", "view", {
        screenKey: item.screenKey,
      }),
    )?.href ?? "/dashboard"
  );
}
