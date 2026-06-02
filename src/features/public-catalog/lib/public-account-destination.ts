export type PublicAccountLabelKey = "landing.myAccount" | "landing.workspace";

export type PublicAccountDestination = {
  href: string;
  labelKey: PublicAccountLabelKey;
};

export function getPublicAccountDestination(user: {
  role: string;
}): PublicAccountDestination {
  const isStaff =
    user.role === "super_admin" ||
    user.role === "admin" ||
    user.role === "employee";

  return isStaff
    ? { href: "/dashboard", labelKey: "landing.workspace" }
    : { href: "/my-account", labelKey: "landing.myAccount" };
}
