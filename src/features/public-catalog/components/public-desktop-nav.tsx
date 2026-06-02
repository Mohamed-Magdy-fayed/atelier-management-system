"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useTranslation } from "@/features/core/i18n/client";
import {
  getPublicTabIndex,
  PUBLIC_MOBILE_TABS,
} from "@/features/public-catalog/lib/public-tabs";
import { cn } from "@/lib/utils";

const TAB_LABEL_KEYS = {
  home: "landing.tabHome",
  browse: "landing.tabBrowse",
  locations: "landing.tabLocations",
} as const;

export function PublicDesktopNav({ className }: { className?: string }) {
  const pathname = usePathname() ?? "/";
  const { t } = useTranslation();
  const activeIndex = getPublicTabIndex(pathname);

  return (
    <nav
      aria-label={String(t("landing.mobileTabBarLabel"))}
      className={cn("hidden items-center gap-1 md:flex", className)}
    >
      {PUBLIC_MOBILE_TABS.map((tab, index) => {
        const active = activeIndex === index;
        return (
          <Link
            key={tab.href}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
            )}
            href={tab.href}
          >
            {String(t(TAB_LABEL_KEYS[tab.key]))}
          </Link>
        );
      })}
    </nav>
  );
}
