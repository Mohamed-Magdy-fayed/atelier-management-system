import type { LucideIcon } from "lucide-react";
import { Box, Building2, LayoutDashboard, UserCircle, Users } from "lucide-react";

type NavTranslationKey =
  | "navDashboard"
  | "navEmployees"
  | "navCustomers"
  | "navBranches"
  | "navProducts";
type BreadcrumbTranslationKey =
  | "breadcrumbDashboard"
  | "breadcrumbEmployees"
  | "breadcrumbCustomers"
  | "breadcrumbBranches"
  | "breadcrumbProducts";

type SystemScreenRecord = {
  key: string;
  href: `/${string}`;
  pathPrefixes: readonly `/${string}`[];
  Icon: LucideIcon;
  showInNav: boolean;
  protected: boolean;
  navTranslationKey: NavTranslationKey | null;
  breadcrumbTranslationKey: BreadcrumbTranslationKey | null;
};

export const SYSTEM_SCREEN_DEFINITIONS = [
  {
    key: "dashboard",
    href: "/dashboard",
    pathPrefixes: ["/dashboard"],
    Icon: LayoutDashboard,
    showInNav: true,
    protected: true,
    navTranslationKey: "navDashboard",
    breadcrumbTranslationKey: "breadcrumbDashboard",
  },
  {
    key: "employee",
    href: "/employees",
    pathPrefixes: ["/employees"],
    Icon: Users,
    showInNav: true,
    protected: true,
    navTranslationKey: "navEmployees",
    breadcrumbTranslationKey: "breadcrumbEmployees",
  },
  {
    key: "customers",
    href: "/customers",
    pathPrefixes: ["/customers"],
    Icon: UserCircle,
    showInNav: true,
    protected: true,
    navTranslationKey: "navCustomers",
    breadcrumbTranslationKey: "breadcrumbCustomers",
  },
  {
    key: "branches",
    href: "/branches",
    pathPrefixes: ["/branches"],
    Icon: Building2,
    showInNav: true,
    protected: true,
    navTranslationKey: "navBranches",
    breadcrumbTranslationKey: "breadcrumbBranches",
  },
  {
    key: "products",
    href: "/products",
    pathPrefixes: ["/products"],
    Icon: Box,
    showInNav: true,
    protected: true,
    navTranslationKey: "navProducts",
    breadcrumbTranslationKey: "breadcrumbProducts",
  },
  {
    key: "my-account",
    href: "/my-account",
    pathPrefixes: ["/my-account"],
    Icon: UserCircle,
    showInNav: false,
    protected: true,
    navTranslationKey: null,
    breadcrumbTranslationKey: null,
  },
] as const satisfies readonly SystemScreenRecord[];

export type ScreenKey = (typeof SYSTEM_SCREEN_DEFINITIONS)[number]["key"];
export type SystemScreenDefinition = (typeof SYSTEM_SCREEN_DEFINITIONS)[number];

export const screenKeys = SYSTEM_SCREEN_DEFINITIONS.map(
  (screen) => screen.key,
) as readonly ScreenKey[];

export type SystemNavItem = {
  href: string;
  translationKey: NavTranslationKey;
  screenKey: ScreenKey;
  Icon: LucideIcon;
};

export const SYSTEM_NAV_ITEMS: readonly SystemNavItem[] =
  SYSTEM_SCREEN_DEFINITIONS.flatMap((screen) =>
    screen.showInNav && screen.navTranslationKey
      ? [
          {
            href: screen.href,
            translationKey: screen.navTranslationKey,
            screenKey: screen.key,
            Icon: screen.Icon,
          },
        ]
      : [],
  );

function matchesPathPrefix(
  pathname: string,
  prefixes: readonly `/${string}`[],
): boolean {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function getScreenDefinition(
  screenKey: ScreenKey,
): SystemScreenDefinition | undefined {
  return SYSTEM_SCREEN_DEFINITIONS.find((screen) => screen.key === screenKey);
}

export function getScreenDefinitionByPathname(
  pathname: string,
): SystemScreenDefinition | undefined {
  return SYSTEM_SCREEN_DEFINITIONS.find((screen) =>
    matchesPathPrefix(pathname, screen.pathPrefixes),
  );
}

export function getProtectedScreenDefinitionByPathname(pathname: string) {
  return SYSTEM_SCREEN_DEFINITIONS.find(
    (screen) =>
      screen.protected && matchesPathPrefix(pathname, screen.pathPrefixes),
  );
}
