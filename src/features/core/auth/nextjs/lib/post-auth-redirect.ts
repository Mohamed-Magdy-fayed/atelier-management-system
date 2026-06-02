import { hasPermission } from "@/features/core/auth/core/permissions";
import type { PartialUser } from "@/features/core/auth/types";
import { SYSTEM_NAV_ITEMS } from "@/features/system/registry";

const EMPLOYEE_HOME_HREF = "/leads";

export function getPostAuthRedirect(user: PartialUser) {
  if (user.role === "customer") {
    return "/my-account";
  }

  if (
    user.role === "employee" &&
    hasPermission(user, "screens", "view", { screenKey: "leads" })
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
