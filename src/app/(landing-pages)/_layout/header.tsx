"use client";

import { LayoutDashboardIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { LinkButton } from "@/components/general/link-button";
import { AuthManagerHeaderTrigger } from "@/features/core/auth/nextjs/components/auth-manager-header-trigger";
import { useAuth } from "@/features/core/auth/nextjs/components/auth-provider";
import { useTranslation } from "@/features/core/i18n/client";
import { cn } from "@/lib/utils";

export function PublicHeader() {
  const { t } = useTranslation();
  const { isAuthenticated, session } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const nav = [
    { label: t("publicPages.nav.services"), href: "/services" },
    { label: t("publicPages.nav.work"), href: "/work" },
    { label: t("publicPages.nav.blog"), href: "/blog" },
    { label: t("publicPages.nav.about"), href: "/about" },
  ];

  const isAdmin =
    isAuthenticated &&
    (session?.user.role === "admin" || session?.user.role === "super_admin");

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300",
        isScrolled
          ? "border-b bg-background/80 shadow-sm backdrop-blur-md"
          : "bg-background/95 backdrop-blur",
      )}
    >
      <div className="container mx-auto relative flex h-16 items-center px-4 md:px-8">
        {/* Logo: absolutely centered on mobile, static left on desktop */}
        <Link
          href="/"
          className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 text-lg font-semibold md:static md:translate-x-0"
        >
          <span className="text-primary">Gateling</span>
          <span className="text-muted-foreground font-normal">Solutions</span>
        </Link>

        {/* Desktop nav — centered via flex-1 */}
        <nav className="hidden flex-1 items-center justify-center gap-1 md:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-foreground/80 hover:bg-accent hover:text-foreground rounded-md px-3 py-2 text-sm font-medium transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Right buttons: desktop only */}
        <div className="hidden items-center gap-2 md:flex">
          <AuthManagerHeaderTrigger />
          {isAdmin ? (
            <LinkButton href="/dashboard" size="sm">
              <LayoutDashboardIcon className="me-2 h-4 w-4" />
              {t("publicPages.nav.dashboard")}
            </LinkButton>
          ) : (
            <LinkButton href="/contact" size="sm">
              {t("publicPages.nav.ctaContact")}
            </LinkButton>
          )}
        </div>
      </div>
    </header>
  );
}
