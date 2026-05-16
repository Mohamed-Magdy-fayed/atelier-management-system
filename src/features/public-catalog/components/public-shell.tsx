import Link from "next/link";

import { Muted } from "@/components/ui/typography";
import { AuthManagerHeaderTrigger } from "@/features/core/auth/nextjs/components/auth-manager-header-trigger";
import { getT } from "@/features/core/i18n/server";

import { PublicMobileTabBar } from "./public-mobile-tab-bar";

export async function PublicShell({ children }: { children: React.ReactNode }) {
  const { t } = await getT();
  const year = new Date().getFullYear();

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="sticky top-0 z-40 shrink-0 border-b border-border/60 bg-background/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <Link
            className="min-w-0 flex-1 space-y-0.5 transition-opacity hover:opacity-90"
            href="/"
          >
            <div className="font-serif text-xl font-semibold tracking-tight md:text-2xl">
              {t("appName")}
            </div>
            <Muted className="hidden text-xs sm:block">
              {t("landing.badge")}
            </Muted>
          </Link>
          <AuthManagerHeaderTrigger className="hidden md:inline-flex" />
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1">{children}</div>
        <PublicMobileTabBar />
      </div>

      <footer className="hidden shrink-0 border-t border-border/60 py-10 md:block">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 text-center sm:px-6 lg:px-8">
          <Muted className="max-w-xl text-sm leading-relaxed">
            {t("landing.footerTagline")}
          </Muted>
          <Muted className="text-xs">{`\u00A9 ${year} ${t("appName")}`}</Muted>
        </div>
      </footer>
    </div>
  );
}
