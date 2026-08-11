import Image from "next/image";
import Link from "next/link";
import { Muted } from "@/components/ui/typography";
import { AuthManagerHeaderTrigger } from "@/features/core/auth/nextjs/components/auth-manager-header-trigger";
import { getT } from "@/features/core/i18n/server";
import { PublicSignedInLink } from "@/features/public-catalog/components/public-signed-in-link";
import { PublicDesktopNav } from "./public-desktop-nav";
import { PublicMobileTabBar } from "./public-mobile-tab-bar";

export async function PublicShell({ children }: { children: React.ReactNode }) {
  const { t } = await getT();
  const year = new Date().getFullYear();

  return (
    <div className="flex h-svh flex-col overflow-hidden bg-background md:h-auto md:min-h-screen md:overflow-visible">
      <header className="sticky top-0 z-40 shrink-0 border-b border-border/60 bg-background/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-4 sm:gap-6 sm:px-6 lg:px-8">
          <Link className="flex items-center gap-2" href="/">
            <Image
              src="/logo.png"
              alt={t("appName")}
              width={512}
              height={512}
              className="w-12 aspect-square"
            />
            <div className="min-w-0 flex-1 transition-opacity hover:opacity-90">
              <div className="font-serif text-xl font-semibold tracking-tight">
                {t("appName")}
              </div>
              <Muted className="text-xs">{t("landing.badge")}</Muted>
            </div>
          </Link>
          <PublicDesktopNav className="flex-1 justify-center" />
          <div className="flex shrink-0 items-center gap-1 sm:gap-2 ms-auto">
            <PublicSignedInLink className="hidden md:inline-flex" />
            <AuthManagerHeaderTrigger className="shrink-0" />
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
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
