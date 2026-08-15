import type { LucideIcon } from "lucide-react";
import {
  Building2,
  CalendarDays,
  CreditCard,
  LayoutDashboard,
  Receipt,
  Settings,
  Shirt,
  UserCircle,
  Users,
} from "lucide-react";

type NavTranslationKey =
  | "navDashboard"
  | "navEmployees"
  | "navCustomers"
  | "navBranches"
  | "navDresses"
  | "navReservations"
  | "navPayments"
  | "navExpenses"
  | "navSettings";
type BreadcrumbTranslationKey =
  | "breadcrumbDashboard"
  | "breadcrumbEmployees"
  | "breadcrumbCustomers"
  | "breadcrumbBranches"
  | "breadcrumbDresses"
  | "breadcrumbReservations"
  | "breadcrumbPayments"
  | "breadcrumbExpenses"
  | "breadcrumbSettings";

type SystemScreenRecord = {
  key: string;
  href: `/${string}`;
  pathPrefixes: readonly `/${string}`[];
  Icon: LucideIcon;
  showInNav: boolean;
  protected: boolean;
  /**
   * Whether an admin can hand this screen to an individual employee.
   *
   * `false` for `branches`, `employee` and `settings`: their mutations are
   * guarded by `assertAdminRole` on the server, so a grant would be cosmetic —
   * the row is left out of the permissions matrix rather than shown as a
   * control that does nothing. Also `false` for `my-account`, which belongs to
   * the customer portal.
   */
  grantable: boolean;
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
    grantable: true,
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
    grantable: false,
    navTranslationKey: "navEmployees",
    breadcrumbTranslationKey: "breadcrumbEmployees",
  },
  {
    key: "customers",
    href: "/rental-customers",
    pathPrefixes: ["/rental-customers", "/customers"],
    Icon: UserCircle,
    showInNav: true,
    protected: true,
    grantable: true,
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
    grantable: false,
    navTranslationKey: "navBranches",
    breadcrumbTranslationKey: "breadcrumbBranches",
  },
  {
    key: "dresses",
    href: "/dresses",
    pathPrefixes: ["/dresses"],
    Icon: Shirt,
    showInNav: true,
    protected: true,
    grantable: true,
    navTranslationKey: "navDresses",
    breadcrumbTranslationKey: "breadcrumbDresses",
  },
  {
    key: "reservations",
    href: "/reservations",
    pathPrefixes: ["/reservations"],
    Icon: CalendarDays,
    showInNav: true,
    protected: true,
    grantable: true,
    navTranslationKey: "navReservations",
    breadcrumbTranslationKey: "breadcrumbReservations",
  },
  {
    key: "payments",
    href: "/payments",
    pathPrefixes: ["/payments"],
    Icon: CreditCard,
    showInNav: true,
    protected: true,
    grantable: true,
    navTranslationKey: "navPayments",
    breadcrumbTranslationKey: "breadcrumbPayments",
  },
  {
    key: "expenses",
    href: "/expenses",
    pathPrefixes: ["/expenses"],
    Icon: Receipt,
    showInNav: true,
    protected: true,
    grantable: true,
    navTranslationKey: "navExpenses",
    breadcrumbTranslationKey: "breadcrumbExpenses",
  },
  {
    key: "settings",
    href: "/settings",
    pathPrefixes: ["/settings"],
    Icon: Settings,
    showInNav: true,
    protected: true,
    grantable: false,
    navTranslationKey: "navSettings",
    breadcrumbTranslationKey: "breadcrumbSettings",
  },
  {
    key: "my-account",
    href: "/my-account",
    pathPrefixes: ["/my-account"],
    Icon: UserCircle,
    showInNav: false,
    protected: true,
    grantable: false,
    navTranslationKey: null,
    breadcrumbTranslationKey: null,
  },
] as const satisfies readonly SystemScreenRecord[];

export type ScreenKey = (typeof SYSTEM_SCREEN_DEFINITIONS)[number]["key"];
export type SystemScreenDefinition = (typeof SYSTEM_SCREEN_DEFINITIONS)[number];

export const screenKeys = SYSTEM_SCREEN_DEFINITIONS.map(
  (screen) => screen.key,
) as readonly ScreenKey[];

/**
 * Screens an admin can assign to an individual employee — the matrix rows.
 *
 * The annotation is load-bearing: without it TypeScript infers a type predicate
 * from the callback and narrows the result to `never`.
 */
export const GRANTABLE_SCREEN_DEFINITIONS: readonly SystemScreenDefinition[] =
  SYSTEM_SCREEN_DEFINITIONS.filter((screen) => screen.grantable);

export const GRANTABLE_SCREEN_KEYS = GRANTABLE_SCREEN_DEFINITIONS.map(
  (screen) => screen.key,
) as readonly ScreenKey[];

export function isGrantableScreenKey(screenKey: string): screenKey is ScreenKey {
  return (GRANTABLE_SCREEN_KEYS as readonly string[]).includes(screenKey);
}

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
