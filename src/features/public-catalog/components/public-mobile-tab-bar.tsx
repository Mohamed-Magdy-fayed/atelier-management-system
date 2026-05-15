"use client";

import {
  HomeIcon,
  LayoutGridIcon,
  MapPinIcon,
  MenuIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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
import { AuthManagerSheetPanel } from "@/features/core/auth/nextjs/components/auth-manager/auth-manager-sheet-panel";
import { useTranslation } from "@/features/core/i18n/client";
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
  const activeIndex = getPublicTabIndex(pathname);

  return (
    <nav
      aria-label={String(t("landing.mobileTabBarLabel"))}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border/80 bg-background/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_24px_-12px_rgba(0,0,0,0.15)] backdrop-blur-md md:hidden"
    >
      <div className="mx-auto grid h-[3.75rem] max-w-lg grid-cols-4">
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
                  {String(t("landing.tabMore"))}
                </span>
              </button>
            }
          />
          <SheetContent className="gap-0" side="bottom" showCloseButton>
            <SheetHeader className="border-b border-border pb-4 text-start">
              <SheetTitle>{String(t("landing.tabMore"))}</SheetTitle>
              <SheetDescription>
                {String(t("landing.moreSheetDescription"))}
              </SheetDescription>
            </SheetHeader>
            <ScrollArea className="max-h-[min(75dvh,32rem)] p-4 pb-6">
              <AuthManagerSheetPanel />
              <SheetClose
                className="mt-4"
                render={<Button className="w-full" variant="outline" />}
              >
                {String(t("common.close"))}
              </SheetClose>
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
