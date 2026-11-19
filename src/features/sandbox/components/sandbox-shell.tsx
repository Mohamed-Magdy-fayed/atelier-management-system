"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { AppShellLayout } from "@/features/core/app-shell";
import { SYSTEM_NAV_ITEMS } from "@/features/core/app-shell/lib/nav";
import { useTranslation } from "@/features/core/i18n/client";
import { useBrandName } from "@/features/system/settings/client/branding-provider";

import { SANDBOX_USER } from "./sandbox-providers";

function SandboxSidebar() {
  const pathname = usePathname() ?? "/";
  const { t, dir } = useTranslation();
  const { setOpenMobile } = useSidebar();
  const brandName = useBrandName();

  return (
    <Sidebar
      collapsible="icon"
      variant="inset"
      side={dir === "rtl" ? "right" : "left"}
      dir={dir}
    >
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1">
          <span className="truncate text-sm font-semibold">{brandName}</span>
          <Badge variant="secondary">{String(t("sandbox.demoBadge"))}</Badge>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {SYSTEM_NAV_ITEMS.map(({ href, translationKey, Icon }) => {
                const label = String(t(`systemPages.${translationKey}`));
                return (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton
                      isActive={
                        pathname === href || pathname.startsWith(`${href}/`)
                      }
                      tooltip={label}
                      onClick={() => setOpenMobile(false)}
                      render={<Link href={href} />}
                    >
                      <Icon aria-hidden />
                      <span>{label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}

/** The real app shell, minus the pieces that need a server session. */
export function SandboxShell({ children }: { children: ReactNode }) {
  return (
    <AppShellLayout
      user={SANDBOX_USER}
      defaultSidebarOpen={false}
      sidebar={<SandboxSidebar />}
      homeHref="/branches"
    >
      {children}
    </AppShellLayout>
  );
}
