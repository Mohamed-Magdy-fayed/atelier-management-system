import type { UserRole } from "@/drizzle/schema";
import type { PartialUser } from "@/features/core/auth/types";
import { type ScreenKey, screenKeys } from "@/features/system/registry";
import type {
  ScreenAction,
  ScreenPermissionMap,
} from "./screen-permission-map";

export type DefaultAction = "view" | "update" | "create" | "delete";

type PermissionCheck<Key extends keyof Permissions> =
  | boolean
  | ((user: PartialUser, data: Permissions[Key]["dataType"]) => boolean);

type RolesWithPermissions = {
  [R in UserRole]: Partial<{
    [Key in keyof Permissions]: Partial<{
      [Action in Permissions[Key]["action"]]: PermissionCheck<Key>;
    }>;
  }>;
};

type BranchPermissionData = {
  userId: string;
  branchId: string;
};

type Permissions = {
  users: {
    dataType: PartialUser;
    action: DefaultAction;
  };
  screens: {
    dataType: { screenKey: ScreenKey };
    action: DefaultAction;
  };
  branches: {
    dataType: BranchPermissionData;
    action: DefaultAction;
  };
};

export const unrestricted = {
  create: true,
  view: true,
  update: true,
  delete: true,
};

export { screenKeys, type ScreenKey };
export {
  SCREEN_ACTIONS,
  type ScreenAction,
  type ScreenPermissionMap,
} from "./screen-permission-map";

/** System screens employees cannot open by default (nav, proxy, direct URLs). */
const EMPLOYEE_BLOCKED_SCREENS = new Set<ScreenKey>([
  "branches",
  "dashboard",
  "employee",
  "settings",
]);

/**
 * A user's explicit grants, or `null` when they have none.
 *
 * Zero rows is treated the same as "no map at all" so that clearing the matrix
 * returns the account to its role defaults instead of locking it out — there
 * would otherwise be no way back from a mis-save through the UI.
 */
function explicitScreenGrants(user: PartialUser): ScreenPermissionMap | null {
  const map = user.screenPermissions;
  if (map == null) return null;
  return Object.keys(map).length > 0 ? map : null;
}

/**
 * Employees default to full CRUD on every screen that is not blocked outright.
 *
 * Wider than the old table, which defined `view` alone — but only because
 * nothing used to ask about the other three. The real server floor is unchanged:
 * `assertOperationalStaff`, `assertAdminRole`, and the branch checks all still
 * run, so a `delete` grant never promotes an employee past them. Defaulting
 * these to `false` instead would lock every existing employee out of every
 * write the moment the resolver guards landed.
 */
function employeeScreenCheck(action: ScreenAction) {
  return (user: PartialUser, data: { screenKey: ScreenKey }): boolean => {
    const grants = explicitScreenGrants(user);
    if (grants) return grants[data.screenKey]?.includes(action) ?? false;
    return !EMPLOYEE_BLOCKED_SCREENS.has(data.screenKey);
  };
}

export const rolesPermissions = {
  admin: {
    users: unrestricted,
    screens: unrestricted,
    branches: unrestricted,
  },
  employee: {
    screens: {
      view: employeeScreenCheck("view"),
      create: employeeScreenCheck("create"),
      update: employeeScreenCheck("update"),
      delete: employeeScreenCheck("delete"),
    },
    users: {
      view: (user: PartialUser, data: PartialUser) => user.id === data.id,
      update: (user: PartialUser, data: PartialUser) => user.id === data.id,
      delete: (user: PartialUser, data: PartialUser) => user.id === data.id,
    },
    branches: {
      view: (user: PartialUser, branch: BranchPermissionData) =>
        user.id === branch.userId,
    },
  },
  customer: {
    users: {
      view: (user: PartialUser, data: PartialUser) => user.id === data.id,
      update: (user: PartialUser, data: PartialUser) => user.id === data.id,
    },
    screens: {
      view: (_, data: { screenKey: ScreenKey }) =>
        data.screenKey === "my-account",
    },
    branches: {
      view: true,
    },
  },
} as const satisfies RolesWithPermissions;

export type Resource = keyof Permissions;
export type Action<Resource extends keyof Permissions> =
  Permissions[Resource]["action"];

export function hasPermission<Resource extends keyof Permissions>(
  user: PartialUser,
  resource: Resource,
  action: Permissions[Resource]["action"],
  data?: Permissions[Resource]["dataType"],
): boolean {
  const permission = (rolesPermissions as RolesWithPermissions)[user.role]?.[
    resource
  ]?.[action];
  if (permission == null) return false;

  if (typeof permission === "boolean") return permission;
  return data != null && permission(user, data);
}

/** Whether this user may perform `action` on `screenKey`. */
export function canOnScreen(
  user: PartialUser,
  screenKey: ScreenKey,
  action: ScreenAction,
): boolean {
  return hasPermission(user, "screens", action, { screenKey });
}

/** Admin workspace dashboard (`/dashboard`), not the customer portal. */
export function canViewAdminDashboard(user: PartialUser): boolean {
  return hasPermission(user, "screens", "view", { screenKey: "dashboard" });
}
