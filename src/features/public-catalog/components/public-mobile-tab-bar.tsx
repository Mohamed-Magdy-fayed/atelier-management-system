"use client";

import {
  HomeIcon,
  LayoutDashboardIcon,
  LayoutGridIcon,
  MapPinIcon,
  UserIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { mobileTabBarShellClassName } from "@/components/general/mobile-tab-bar";
import { useAuth } from "@/features/core/auth/nextjs/components/auth-provider";
import { useTranslation } from "@/features/core/i18n/client";
import {
  getPublicAccountDestination,
  isPublicAccountPathActive,
} from "@/features/public-catalog/lib/public-account-destination";
import {
  getPublicTabIndex,
  PUBLIC_MOBILE_TABS,
} from "@/features/public-catalog/lib/public-tabs";
import { cn } from "@/lib/utils";

const TAB_ICONS = {
  home: HomeIcon,
  browse: LayoutGridIcon,
  locations: MapPinIcon,
} as const;

const TAB_LABEL_KEYS = {
  home: "landing.tabHome",
  browse: "landing.tabBrowse",
  locations: "landing.tabLocations",
} as const;

export function PublicMobileTabBar() {
  const pathname = usePathname() ?? "/";
  const { t } = useTranslation();
  const { isAuthenticated, session } = useAuth();
  const activeIndex = getPublicTabIndex(pathname);

  const accountDestination = isAuthenticated
    ? getPublicAccountDestination(session.user)
    : null;
  const AccountIcon =
    accountDestination?.href === "/dashboard" ? LayoutDashboardIcon : UserIcon;

  return (
    <nav
      aria-label={String(t("landing.mobileTabBarLabel"))}
      className={mobileTabBarShellClassName}
    >
      <div
        className={cn(
          "mx-auto h-[3.75rem]",
          isAuthenticated
            ? "grid max-w-lg grid-cols-4"
            : "grid max-w-[calc(3/4*32rem)] grid-cols-3",
        )}
      >
        {PUBLIC_MOBILE_TABS.map((tab, index) => {
          const Icon = TAB_ICONS[tab.key];
          const active = activeIndex === index;
          return (
            <Link
              key={tab.href}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[0.625rem] font-medium transition-colors",
                active
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground active:bg-muted/60",
              )}
              href={tab.href}
            >
              <Icon className="size-[1.35rem] shrink-0" aria-hidden />
              <span className="line-clamp-2 text-center leading-tight">
                {String(t(TAB_LABEL_KEYS[tab.key]))}
              </span>
            </Link>
          );
        })}
        {accountDestination && (
          <Link
            className={cn(
              "flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[0.625rem] font-medium transition-colors",
              isPublicAccountPathActive(pathname, accountDestination.href)
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground active:bg-muted/60",
            )}
            href={accountDestination.href}
          >
            <AccountIcon className="size-[1.35rem] shrink-0" aria-hidden />
            <span className="line-clamp-2 text-center leading-tight">
              {String(t(accountDestination.labelKey))}
            </span>
          </Link>
        )}
      </div>
    </nav>
  );
}
