import { canViewAdminDashboard } from "@/features/core/auth/core/permissions";
import { getPostAuthRedirect } from "@/features/core/auth/nextjs/lib/post-auth-redirect";
import type { PartialUser } from "@/features/core/auth/types";

export type PublicAccountLabelKey =
  | "landing.myAccount"
  | "common.dashboard"
  | "landing.workspace";

export function getPublicAccountDestination(user: PartialUser): {
  href: string;
  labelKey: PublicAccountLabelKey;
} {
  if (user.role === "customer") {
    return { href: "/my-account", labelKey: "landing.myAccount" };
  }
  if (canViewAdminDashboard(user)) {
    return { href: "/dashboard", labelKey: "common.dashboard" };
  }
  return { href: getPostAuthRedirect(user), labelKey: "landing.workspace" };
}

export function isPublicAccountPathActive(
  pathname: string,
  href: string,
): boolean {
  if (href === "/my-account") return pathname.startsWith("/my-account");
  if (href === "/dashboard") return pathname.startsWith("/dashboard");
  return pathname === href || pathname.startsWith(`${href}/`);
}
