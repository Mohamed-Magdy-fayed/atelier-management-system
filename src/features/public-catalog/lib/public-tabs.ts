export const PUBLIC_MOBILE_TABS = [
  { href: "/", key: "home" },
  { href: "/browse", key: "browse" },
  { href: "/locations", key: "locations" },
] as const;

export type PublicMobileTabHref = (typeof PUBLIC_MOBILE_TABS)[number]["href"];

export function getPublicTabIndex(pathname: string): number {
  const exact = PUBLIC_MOBILE_TABS.findIndex((t) => t.href === pathname);
  if (exact >= 0) return exact;
  if (pathname.startsWith("/browse")) return 1;
  if (pathname.startsWith("/locations")) return 2;
  return 0;
}

export const PUBLIC_SITE_PATHS = PUBLIC_MOBILE_TABS.map((t) => t.href);
