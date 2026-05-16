"use client";

import { MenuIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

import { LinkButton } from "@/components/general/link-button";
import {
  MobileTabBar,
  MobileTabLink,
} from "@/components/general/mobile-tab-bar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SidebarTrigger } from "@/components/ui/sidebar";
import type { User } from "@/drizzle/schema";
import { SYSTEM_MOBILE_PRIMARY_SCREEN_KEYS } from "@/features/core/app-shell/lib/mobile-nav";
import { SYSTEM_NAV_ITEMS } from "@/features/core/app-shell/lib/nav";
import { hasPermission } from "@/features/core/auth/core/permissions";
import { ThemeToggle } from "@/features/core/color-theme/client";
import { LanguageToggle, useTranslation } from "@/features/core/i18n/client";
import { cn } from "@/lib/utils";

function navLabelKey(
  translationKey: (typeof SYSTEM_NAV_ITEMS)[number]["translationKey"],
) {
  return `systemPages.${translationKey}` as const;
}

export function SystemMobileTabBar({ user }: { user: User }) {
  const pathname = usePathname() ?? "/";
  const { t } = useTranslation();

  const visibleNav = useMemo(
    () =>
      SYSTEM_NAV_ITEMS.filter((item) =>
        hasPermission(user, "screens", "view", { screenKey: item.screenKey }),
      ),
    [user],
  );

  const primaryNav = useMemo(
    () =>
      SYSTEM_MOBILE_PRIMARY_SCREEN_KEYS.flatMap((key) => {
        const item = visibleNav.find((n) => n.screenKey === key);
        return item ? [item] : [];
      }),
    [visibleNav],
  );

  const overflowNav = useMemo(
    () =>
      visibleNav.filter(
        (item) =>
          !(SYSTEM_MOBILE_PRIMARY_SCREEN_KEYS as readonly string[]).includes(
            item.screenKey,
          ),
      ),
    [visibleNav],
  );

  if (primaryNav.length === 0) return null;

  const tabColumnCount = primaryNav.length + 1;

  return (
    <MobileTabBar
      ariaLabel={String(t("systemPages.mobileTabBarLabel"))}
      columnCount={tabColumnCount}
    >
      {primaryNav.map(({ href, translationKey, Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <MobileTabLink
            active={active}
            href={href}
            icon={Icon}
            key={href}
            label={String(t(navLabelKey(translationKey)))}
          />
        );
      })}
      <Sheet>
        <SheetTrigger
          render={
            <button
              type="button"
              className={cn(
                "flex min-h-14 w-full flex-col items-center justify-center gap-0.5 px-1 py-2 text-[0.625rem] font-medium text-muted-foreground transition-colors",
                "hover:text-foreground active:bg-muted/60",
              )}
            >
              <MenuIcon className="size-[1.35rem] shrink-0" aria-hidden />
              <span className="line-clamp-2 text-center leading-tight">
                {String(t("systemPages.mobileTabMore"))}
              </span>
            </button>
          }
        />
        <SheetContent className="gap-0" side="bottom" showCloseButton>
          <SheetHeader className="border-b border-border pb-4 text-start">
            <SheetTitle>{String(t("systemPages.mobileTabMore"))}</SheetTitle>
            <SheetDescription>
              {String(t("systemPages.mobileMoreSheetDescription"))}
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="flex max-h-[min(70dvh,28rem)] flex-col gap-2 p-4">
            {overflowNav.map(({ href, translationKey, Icon }) => (
              <Link
                className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium hover:bg-muted"
                href={href}
                key={href}
              >
                <Icon
                  className="size-5 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                {String(t(navLabelKey(translationKey)))}
              </Link>
            ))}
            <div className="flex items-center justify-between gap-4 rounded-xl border bg-muted/30 px-4 py-3">
              <span className="font-medium text-muted-foreground text-xs">
                {String(t("themeToggle"))}
              </span>
              <ThemeToggle />
            </div>
            <div className="flex items-center justify-between gap-4 rounded-xl border bg-muted/30 px-4 py-3">
              <span className="font-medium text-muted-foreground text-xs">
                {String(t("languageToggle"))}
              </span>
              <LanguageToggle />
            </div>
            <div className="flex items-center gap-2 border-t border-border pt-3">
              <SidebarTrigger />
              <span className="text-muted-foreground text-xs">
                {String(t("systemPages.toggleSidebar"))}
              </span>
            </div>
            <LinkButton
              className="w-full justify-center"
              href="/"
              variant="outline"
            >
              {String(t("landing.tabHome"))}
            </LinkButton>
            <SheetClose
              render={<Button className="w-full" variant="outline" />}
            >
              {String(t("common.close"))}
            </SheetClose>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </MobileTabBar>
  );
}
