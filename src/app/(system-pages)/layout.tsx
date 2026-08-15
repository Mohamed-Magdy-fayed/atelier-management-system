import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AppShellLayout } from "@/features/core/app-shell";
import { hasPermission } from "@/features/core/auth/core/permissions";
import { writeScreenPermissionsCache } from "@/features/core/auth/core/screen-permission-cache";
import { getAuth } from "@/features/core/auth/nextjs/actions";
import { getProtectedScreenDefinitionByPathname } from "@/features/system/registry";
import { PATHNAME_HEADER } from "@/proxy";

export default async function SystemPagesLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const auth = await getAuth();
  if (!auth.isAuthenticated) redirect("/sign-in");
  if (auth.session.user.role === "customer") redirect("/my-account");

  // The shadcn Sidebar persists state in this cookie; respect it during SSR so
  // the layout doesn't flicker from open → collapsed (or vice versa) on load.
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  const defaultSidebarOpen =
    cookieStore.get("sidebar_state")?.value !== "false";

  /**
   * The authoritative screen gate.
   *
   * The proxy checks the same thing against a Redis mirror and fails open on a
   * miss; this runs against the database (via `getAuth`), so it is what actually
   * keeps a restricted employee off a screen they typed the URL for.
   *
   * Layouts do not receive the pathname, so the proxy forwards it in a header.
   */
  const pathname = headerStore.get(PATHNAME_HEADER);
  const screen = pathname
    ? getProtectedScreenDefinitionByPathname(pathname)
    : undefined;

  if (
    screen &&
    !hasPermission(auth.session.user, "screens", "view", {
      screenKey: screen.key,
    })
  ) {
    redirect("/unauthorized");
  }

  // Repairs a cold or evicted mirror, so the proxy's cheap check is correct from
  // the next navigation onwards. Overwrite-only — never deleted here.
  await writeScreenPermissionsCache(
    auth.session.user.id,
    auth.session.user.screenPermissions ?? {},
  );

  return (
    <AppShellLayout
      user={auth.session.user}
      defaultSidebarOpen={defaultSidebarOpen}
    >
      {children}
    </AppShellLayout>
  );
}
