import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Briefcase,
  Building2,
  FileText,
  Inbox,
  LayoutDashboard,
  Mail,
  MessageSquare,
  Settings,
  Star,
  UserCircle,
  Users,
} from "lucide-react";

type NavTranslationKey =
  | "navDashboard"
  | "navWork"
  | "navBlogPosts"
  | "navServices"
  | "navTestimonials"
  | "navLeads"
  | "navSubscribers"
  | "navUsers"
  | "navBranches"
  | "navSettings";

type BreadcrumbTranslationKey =
  | "breadcrumbDashboard"
  | "breadcrumbWork"
  | "breadcrumbBlogPosts"
  | "breadcrumbServices"
  | "breadcrumbTestimonials"
  | "breadcrumbLeads"
  | "breadcrumbSubscribers"
  | "breadcrumbUsers"
  | "breadcrumbBranches"
  | "breadcrumbSettings";

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
    key: "work",
    href: "/work-mgmt",
    pathPrefixes: ["/work-mgmt"],
    Icon: Briefcase,
    showInNav: true,
    protected: true,
    navTranslationKey: "navWork",
    breadcrumbTranslationKey: "breadcrumbWork",
  },
  {
    key: "blogPosts",
    href: "/blog-posts",
    pathPrefixes: ["/blog-posts"],
    Icon: FileText,
    showInNav: true,
    protected: true,
    navTranslationKey: "navBlogPosts",
    breadcrumbTranslationKey: "breadcrumbBlogPosts",
  },
  {
    key: "services",
    href: "/services-mgmt",
    pathPrefixes: ["/services-mgmt"],
    Icon: Inbox,
    showInNav: true,
    protected: true,
    navTranslationKey: "navServices",
    breadcrumbTranslationKey: "breadcrumbServices",
  },
  {
    key: "testimonials",
    href: "/testimonials",
    pathPrefixes: ["/testimonials"],
    Icon: Star,
    showInNav: true,
    protected: true,
    navTranslationKey: "navTestimonials",
    breadcrumbTranslationKey: "breadcrumbTestimonials",
  },
  {
    key: "leads",
    href: "/leads",
    pathPrefixes: ["/leads"],
    Icon: MessageSquare,
    showInNav: true,
    protected: true,
    navTranslationKey: "navLeads",
    breadcrumbTranslationKey: "breadcrumbLeads",
  },
  {
    key: "subscribers",
    href: "/subscribers",
    pathPrefixes: ["/subscribers"],
    Icon: Mail,
    showInNav: true,
    protected: true,
    navTranslationKey: "navSubscribers",
    breadcrumbTranslationKey: "breadcrumbSubscribers",
  },
  {
    key: "users",
    href: "/users",
    pathPrefixes: ["/users"],
    Icon: Users,
    showInNav: true,
    protected: true,
    navTranslationKey: "navUsers",
    breadcrumbTranslationKey: "breadcrumbUsers",
  },
  {
    key: "branches",
    href: "/branches",
    pathPrefixes: ["/branches"],
    Icon: Building2,
    showInNav: false,
    protected: true,
    navTranslationKey: "navBranches",
    breadcrumbTranslationKey: "breadcrumbBranches",
  },
  {
    key: "settings",
    href: "/settings",
    pathPrefixes: ["/settings"],
    Icon: Settings,
    showInNav: true,
    protected: true,
    navTranslationKey: "navSettings",
    breadcrumbTranslationKey: "breadcrumbSettings",
  },
  {
    key: "blog",
    href: "/blog",
    pathPrefixes: ["/blog"],
    Icon: BookOpen,
    showInNav: false,
    protected: false,
    navTranslationKey: null,
    breadcrumbTranslationKey: null,
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
