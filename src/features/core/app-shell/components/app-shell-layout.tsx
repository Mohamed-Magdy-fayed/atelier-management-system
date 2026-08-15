"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useMemo } from "react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { hasPermission } from "@/features/core/auth/core/permissions";
import type { AuthUser } from "@/features/core/auth/types";
import { useTranslation } from "@/features/core/i18n/client";
import { useBrandName } from "@/features/system/settings/client/branding-provider";

import type { SystemNavItem } from "../lib/nav";
import { SYSTEM_NAV_ITEMS } from "../lib/nav";
import { AppSidebar } from "./app-sidebar";
import { SystemMobileTabBar } from "./system-mobile-tab-bar";

type AppShellLayoutProps = {
  /** Carries `screenPermissions`, so nav filtering respects per-user grants. */
  user: AuthUser;
  /** Resolved from the `sidebar_state` cookie on the server. */
  defaultSidebarOpen?: boolean;
  children: ReactNode;
};

function navLabelKey(translationKey: SystemNavItem["translationKey"]) {
  return `systemPages.${translationKey}` as const;
}

export function AppShellLayout({
  user,
  defaultSidebarOpen = true,
  children,
}: AppShellLayoutProps) {
  const pathname = usePathname() ?? "/";
  const { t } = useTranslation();
  const brandName = useBrandName();

  const visibleNav = useMemo(
    () =>
      SYSTEM_NAV_ITEMS.filter((item) =>
        hasPermission(user, "screens", "view", { screenKey: item.screenKey }),
      ),
    [user],
  );

  const currentNav = useMemo(() => {
    const exact = visibleNav.find((i) => i.href === pathname);
    if (exact) return exact;
    return visibleNav.find(
      (i) => pathname === i.href || pathname.startsWith(`${i.href}/`),
    );
  }, [pathname, visibleNav]);

  const breadcrumbLabel = currentNav
    ? String(t(navLabelKey(currentNav.translationKey)))
    : "";

  return (
    <SidebarProvider
      defaultOpen={defaultSidebarOpen}
      className="h-svh overflow-hidden"
    >
      <AppSidebar user={user} />
      <SidebarInset className="flex min-h-0 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-2 md:px-4">
          <SidebarTrigger className="-ms-1" />
          <Separator orientation="vertical" className="mx-1 h-4" />
          <nav
            className="min-w-0 flex-1 truncate text-xs text-muted-foreground"
            aria-label="Breadcrumb"
          >
            <ol className="flex items-center gap-1">
              <li>
                <Link href="/" className="hover:text-foreground">
                  {brandName}
                </Link>
              </li>
              {breadcrumbLabel ? (
                <>
                  <li aria-hidden className="text-muted-foreground">
                    /
                  </li>
                  <li className="truncate font-medium text-foreground">
                    {breadcrumbLabel}
                  </li>
                </>
              ) : null}
            </ol>
          </nav>
        </header>
        <ScrollArea className="min-h-0 flex-1">
          <div className="p-3 sm:p-4 md:p-6">{children}</div>
        </ScrollArea>
        <SystemMobileTabBar user={user} />
      </SidebarInset>
    </SidebarProvider>
  );
}
