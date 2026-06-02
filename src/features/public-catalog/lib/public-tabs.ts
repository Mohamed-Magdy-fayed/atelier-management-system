/** Public-facing paths that do not require authentication. */
export const PUBLIC_SITE_PATHS = [
  "/",
  "/services",
  "/work",
  "/about",
  "/contact",
  "/blog",
  "/tools",
  "/privacy",
  "/terms",
] as const;

export const PUBLIC_MOBILE_TABS = [
  { href: "/", key: "home" },
  { href: "/work", key: "work" },
  { href: "/services", key: "services" },
  { href: "/contact", key: "contact" },
] as const;

export type PublicMobileTabKey = (typeof PUBLIC_MOBILE_TABS)[number]["key"];

export function getPublicTabIndex(pathname: string): number {
  if (pathname === "/") return 0;
  if (pathname.startsWith("/work")) return 1;
  if (pathname.startsWith("/services") || pathname.startsWith("/tools"))
    return 2;
  if (pathname.startsWith("/contact")) return 3;
  // Blog and About live in the "More" sheet
  if (pathname.startsWith("/blog") || pathname.startsWith("/about")) return 4;
  return -1;
}
