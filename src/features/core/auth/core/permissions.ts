import type { UserRole } from "@/drizzle/schema";
import type { PartialUser } from "@/features/core/auth/types";
import { screenKeys, type ScreenKey } from "@/features/system/registry";

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

export const rolesPermissions = {
  admin: {
    users: unrestricted,
    screens: unrestricted,
    branches: unrestricted,
  },
  employee: {
    screens: {
      view: true,
    },
    users: {
      view: (user: PartialUser, data: PartialUser) => user.id === data.id,
      update: (user: PartialUser, data: PartialUser) => user.id === data.id,
      delete: (user: PartialUser, data: PartialUser) => user.id === data.id,
    },
    branches: {
      view: (user: PartialUser, branch: BranchPermissionData) => user.id === branch.userId,
    },
  },
  customer: {
    users: {
      view: (user: PartialUser, data: PartialUser) => user.id === data.id,
      update: (user: PartialUser, data: PartialUser) => user.id === data.id,
    },
    screens: {
      view: (_, data: { screenKey: ScreenKey }) => data.screenKey === "my-account"
    },
    branches: {
      view: true,
    }
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
