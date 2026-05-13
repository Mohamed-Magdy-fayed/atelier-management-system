import {
  ArrowRight,
  Building2,
  CalendarClock,
  Package,
} from "lucide-react";

import { LinkButton } from "@/components/general/link-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { H1, Lead, Muted } from "@/components/ui/typography";
import { hasPermission } from "@/features/core/auth/core/permissions";
import { getAuth } from "@/features/core/auth/nextjs/actions";
import { ThemeToggle } from "@/features/core/color-theme/client";
import { SYSTEM_NAV_ITEMS } from "@/features/core/app-shell/lib/nav";
import { LanguageToggle } from "@/features/core/i18n/client";
import { getT } from "@/features/core/i18n/server";

const LANDING_FEATURES = [
  {
    key: "catalog",
    Icon: Package,
    titleKey: "landing.statOperationsTitle",
    bodyKey: "landing.statOperationsBody",
  },
  {
    key: "bookings",
    Icon: CalendarClock,
    titleKey: "landing.statVisibilityTitle",
    bodyKey: "landing.statVisibilityBody",
  },
  {
    key: "operations",
    Icon: Building2,
    titleKey: "landing.statScaleTitle",
    bodyKey: "landing.statScaleBody",
  },
] as const;

export default async function Home() {
  const { t } = await getT();
  const auth = await getAuth();

  const workspaceTarget = auth.isAuthenticated
    ? (SYSTEM_NAV_ITEMS.find((item) =>
        hasPermission(auth.session.user, "screens", "view", {
          screenKey: item.screenKey,
        }),
      )?.href ?? "/dashboard")
    : "/sign-in";

  const primaryHref = auth.isAuthenticated ? workspaceTarget : "#capabilities";
  const secondaryHref = auth.isAuthenticated ? "/dashboard" : "/sign-in";
  const primaryLabel = auth.isAuthenticated
    ? t("landing.primaryAuthenticated")
    : t("landing.primaryGuest");
  const secondaryLabel = auth.isAuthenticated
    ? t("landing.secondaryAuthenticated")
    : t("landing.secondaryGuest");

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-4 border-b pb-6">
          <div className="space-y-1">
            <div className="text-lg font-semibold tracking-tight">
              {t("appName")}
            </div>
            <Muted>{t("landing.badge")}</Muted>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageToggle />
          </div>
        </header>

        <section className="grid flex-1 gap-10 py-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(20rem,0.9fr)] lg:items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center rounded-full border bg-muted px-3 py-1 text-sm font-medium text-muted-foreground">
              {t("landing.badge")}
            </div>
            <div className="space-y-4">
              <H1 className="max-w-4xl text-4xl leading-tight lg:text-6xl">
                {t("landing.title")}
              </H1>
              <Lead className="max-w-3xl text-balance">
                {t("landing.lead")}
              </Lead>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <LinkButton href={primaryHref} size="lg">
                {primaryLabel}
                <ArrowRight className="size-4" />
              </LinkButton>
              <LinkButton href={secondaryHref} size="lg" variant="outline">
                {secondaryLabel}
              </LinkButton>
            </div>
          </div>

          <Card className="border-primary/15 bg-gradient-to-br from-primary/5 via-background to-background shadow-sm">
            <CardHeader className="space-y-3">
              <CardTitle className="text-2xl">{t("landing.authPanelTitle")}</CardTitle>
              <CardDescription className="text-base leading-7">
                {t("landing.authPanelLead")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Muted className="text-sm leading-6">
                {t("landing.badge")}
              </Muted>
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                {LANDING_FEATURES.map(({ key, Icon, titleKey, bodyKey }) => (
                  <div
                    key={key}
                    className="rounded-xl border bg-card/80 p-4 shadow-sm"
                  >
                    <div className="mb-3 inline-flex rounded-lg bg-primary/10 p-2 text-primary">
                      <Icon className="size-4" />
                    </div>
                    <div className="space-y-1">
                      <div className="font-medium">{t(titleKey)}</div>
                      <Muted className="leading-6">{t(bodyKey)}</Muted>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        <section
          id="capabilities"
          className="grid gap-4 border-t py-8 md:grid-cols-3"
        >
          {LANDING_FEATURES.map(({ key, Icon, titleKey, bodyKey }) => (
            <Card key={key} className="h-full">
              <CardHeader>
                <div className="mb-2 inline-flex w-fit rounded-lg bg-primary/10 p-2 text-primary">
                  <Icon className="size-4" />
                </div>
                <CardTitle className="text-xl">{t(titleKey)}</CardTitle>
                <CardDescription className="leading-7">
                  {t(bodyKey)}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </section>
      </div>
    </main>
  );
}
