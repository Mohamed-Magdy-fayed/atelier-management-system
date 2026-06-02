"use client";

import {
  BookOpenIcon,
  BriefcaseIcon,
  HomeIcon,
  InfoIcon,
  MenuIcon,
  MessageSquareIcon,
  WrenchIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  MobileTabBar,
  MobileTabLink,
} from "@/components/general/mobile-tab-bar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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
import { getPublicTabIndex } from "@/features/public-catalog/lib/public-tabs";
import { cn } from "@/lib/utils";

export function PublicLandingMobileTabBar() {
  const { t } = useTranslation();
  const pathname = usePathname() ?? "/";
  const activeIndex = getPublicTabIndex(pathname);
  const isMoreActive = activeIndex === 4;

  const tabs = [
    { href: "/", icon: HomeIcon, label: t("landing.tabHome") },
    { href: "/work", icon: BriefcaseIcon, label: t("landing.tabWork") },
    { href: "/services", icon: WrenchIcon, label: t("landing.tabServices") },
    {
      href: "/contact",
      icon: MessageSquareIcon,
      label: t("landing.tabContact"),
    },
  ] as const;

  const moreNav = [
    { href: "/blog", icon: BookOpenIcon, label: t("publicPages.nav.blog") },
    { href: "/about", icon: InfoIcon, label: t("publicPages.nav.about") },
  ] as const;

  return (
    <MobileTabBar ariaLabel={t("landing.mobileTabBarLabel")} columnCount={5}>
      {tabs.map((tab, index) => (
        <MobileTabLink
          key={tab.href}
          href={tab.href}
          icon={tab.icon}
          label={tab.label}
          active={activeIndex === index}
        />
      ))}
      <Sheet>
        <SheetTrigger
          render={
            <button
              type="button"
              className={cn(
                "relative flex min-h-14 w-full flex-col items-center justify-center gap-0.5 px-1 py-2",
                "text-[0.625rem] font-medium transition-colors",
                isMoreActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground active:bg-muted/60",
              )}
            />
          }
        >
          <span
            className={cn(
              "absolute inset-x-3 top-0 h-[2.5px] rounded-full bg-primary transition-opacity duration-300",
              isMoreActive ? "opacity-100" : "opacity-0",
            )}
          />
          <MenuIcon className="size-[1.35rem] shrink-0" aria-hidden />
          <span className="line-clamp-2 text-center leading-tight">
            {t("landing.tabMore")}
          </span>
        </SheetTrigger>
        <SheetContent side="bottom" showCloseButton className="gap-0">
          <SheetHeader className="border-b border-border pb-4 text-start">
            <SheetTitle>Gateling Solutions</SheetTitle>
            <SheetDescription>
              {t("landing.moreSheetDescription")}
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="max-h-[min(75dvh,32rem)] p-4 pb-6">
            {/* Secondary nav links (Blog, About) */}
            <div className="flex flex-col gap-1">
              {moreNav.map((item) => (
                <SheetClose
                  key={item.href}
                  render={
                    <Link
                      href={item.href}
                      className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors hover:bg-muted"
                    />
                  }
                >
                  <item.icon className="size-5 shrink-0 text-muted-foreground" />
                  {item.label}
                </SheetClose>
              ))}
            </div>
            <Separator className="my-4" />
            <AuthManagerSheetPanel />
            <SheetClose
              className="mt-4"
              render={<Button className="w-full" variant="outline" />}
            >
              {t("common.close")}
            </SheetClose>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </MobileTabBar>
  );
}
