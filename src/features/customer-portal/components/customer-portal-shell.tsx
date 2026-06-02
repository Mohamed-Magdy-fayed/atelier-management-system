import Link from "next/link";

import { Muted } from "@/components/ui/typography";
import { AuthManagerHeaderTrigger } from "@/features/core/auth/nextjs/components/auth-manager-header-trigger";
import { getT } from "@/features/core/i18n/server";

import { CustomerMobileTabBar } from "./customer-mobile-tab-bar";

export async function CustomerPortalShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = await getT();
  const year = new Date().getFullYear();

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="sticky top-0 z-40 shrink-0 border-b border-border/60 bg-background/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-4">
          <Link
            className="min-w-0 flex-1 transition-opacity hover:opacity-90"
            href="/"
          >
            <div className="font-serif text-xl font-semibold tracking-tight">
              {t("appName")}
            </div>
            <Muted className="text-xs">{t("customerPortal.badge")}</Muted>
          </Link>
          <AuthManagerHeaderTrigger />
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col">
        <main className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto px-4 py-6 sm:px-6">
          {children}
        </main>
        <CustomerMobileTabBar />
      </div>

      <footer className="hidden shrink-0 border-t border-border/60 py-8 md:block">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <Muted className="text-xs">{`\u00A9 ${year} ${t("appName")}`}</Muted>
        </div>
      </footer>
    </div>
  );
}
