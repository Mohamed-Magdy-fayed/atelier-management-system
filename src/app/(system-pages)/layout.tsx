import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AppShellLayout } from "@/features/core/app-shell";
import { getAuth } from "@/features/core/auth/nextjs/actions";

export default async function SystemPagesLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const auth = await getAuth();
  if (!auth.isAuthenticated) redirect("/sign-in");
  if (auth.session.user.role === "customer") redirect("/");

  // The shadcn Sidebar persists state in this cookie; respect it during SSR so
  // the layout doesn't flicker from open → collapsed (or vice versa) on load.
  const cookieStore = await cookies();
  const defaultSidebarOpen =
    cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <AppShellLayout
      user={auth.session.user}
      defaultSidebarOpen={defaultSidebarOpen}
    >
      {children}
    </AppShellLayout>
  );
}
