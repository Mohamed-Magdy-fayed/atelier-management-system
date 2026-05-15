"use client";

import {
  CalendarDaysIcon,
  HomeIcon,
  LayoutGridIcon,
  MenuIcon,
  UserCircleIcon,
} from "lucide-react";
import { usePathname } from "next/navigation";

import { LinkButton } from "@/components/general/link-button";
import {
  MobileTabBar,
  MobileTabLink,
} from "@/components/general/mobile-tab-bar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Muted } from "@/components/ui/typography";
import { useTranslation } from "@/features/core/i18n/client";
import { cn } from "@/lib/utils";

export function CustomerMobileTabBar() {
  const pathname = usePathname() ?? "/";
  const { t } = useTranslation();
  const onAccount = pathname.startsWith("/my-account");

  return (
    <MobileTabBar ariaLabel={String(t("customerPortal.mobileTabBarLabel"))}>
      <MobileTabLink
        href="/"
        icon={HomeIcon}
        label={String(t("landing.tabHome"))}
      />
      <MobileTabLink
        href="/browse"
        icon={LayoutGridIcon}
        label={String(t("landing.tabBrowse"))}
      />
      <MobileTabLink
        active={onAccount}
        href="/my-account#overview"
        icon={UserCircleIcon}
        label={String(t("customerPortal.tabOverview"))}
      />
      <MobileTabLink
        href="/my-account#reservations"
        icon={CalendarDaysIcon}
        label={String(t("customerPortal.tabReservations"))}
      />
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
              {String(t("customerPortal.moreSheetDescription"))}
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-4 p-6">
            <Muted className="text-center text-xs leading-relaxed">
              {String(t("landing.moreSheetAccountHint"))}
            </Muted>
            <LinkButton
              className="w-full justify-center"
              href="/#locations"
              variant="outline"
            >
              {String(t("landing.tabLocations"))}
            </LinkButton>
            <SheetClose
              render={<Button className="w-full" variant="outline" />}
            >
              {String(t("common.close"))}
            </SheetClose>
          </div>
        </SheetContent>
      </Sheet>
    </MobileTabBar>
  );
}
