import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, UserCircle, Users } from "lucide-react";

import type { ScreenKey } from "@/features/core/auth/core/permissions";

export type SystemNavItem = {
  href: string;
  /** Key path for `t(...)` excluding namespace — use `systemPages.${translationKey}` */
  translationKey:
    | "navDashboard"
    | "navEmployees"
    | "navCustomers";
  screenKey: ScreenKey;
  Icon: LucideIcon;
};

export const SYSTEM_NAV_ITEMS: readonly SystemNavItem[] = [
  {
    href: "/dashboard",
    translationKey: "navDashboard",
    screenKey: "dashboard",
    Icon: LayoutDashboard,
  },
  {
    href: "/employees",
    translationKey: "navEmployees",
    screenKey: "employee",
    Icon: Users,
  },
  {
    href: "/customers",
    translationKey: "navCustomers",
    screenKey: "customers",
    Icon: UserCircle,
  },
];
