import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

import { LinkButton } from "@/components/general/link-button";
import { buttonVariants } from "@/components/ui/button";
import { H1, Lead, Muted } from "@/components/ui/typography";
import { getAuth } from "@/features/core/auth/nextjs/actions";
import { getPostAuthRedirect } from "@/features/core/auth/nextjs/lib/post-auth-redirect";
import { getLocaleCookie, getT } from "@/features/core/i18n/server";
import { PublicDressCard } from "@/features/public-catalog/components/public-dress-card";
import { PublicPageShell } from "@/features/public-catalog/components/public-page-shell";
import {
  getPublicCatalogHidePrices,
  listFeaturedPublicDresses,
  listPublicBranches,
} from "@/features/public-catalog/server/queries";
import { cn } from "@/lib/utils";

export default async function PublicHomePage() {
  const { t } = await getT();
  const locale = await getLocaleCookie();
  const auth = await getAuth();

  const secondaryHref = auth.isAuthenticated
    ? getPostAuthRedirect(auth.session.user)
    : "/sign-in";
  const secondaryLabel = auth.isAuthenticated
    ? auth.session.user.role === "customer"
      ? t("landing.primaryAuthenticatedCustomer")
      : t("landing.secondaryAuthenticated")
    : t("landing.secondaryGuest");

  const [branches, peek, hidePrices] = await Promise.all([
    listPublicBranches(),
    listFeaturedPublicDresses(6),
    getPublicCatalogHidePrices(),
  ]);

  const labels = {
    perDay: t("publicCatalog.perDay"),
    branchSection: t("publicCatalog.branchSectionTitle"),
    noImage: t("publicCatalog.noImage"),
  };

  return (
    <PublicPageShell className="flex flex-col">
      <section className="relative flex flex-1 flex-col justify-center overflow-hidden border-b border-border/60 bg-gradient-to-b from-muted/50 via-background to-background">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,hsl(var(--primary)/0.12),transparent)]" />
        <div className="pointer-events-none absolute -end-24 top-1/4 size-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -start-16 bottom-0 size-56 rounded-full bg-primary/5 blur-3xl" />
        <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="mx-auto max-w-3xl space-y-6 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-background/80 px-3 py-1 text-muted-foreground text-xs backdrop-blur-sm">
              <Sparkles className="size-3.5 text-primary" aria-hidden />
              <span>{t("landing.badge")}</span>
            </div>
            <div className="space-y-4">
              <H1 className="font-serif text-4xl leading-[1.08] tracking-tight md:text-5xl md:leading-[1.06]">
                {t("landing.title")}
              </H1>
              <Lead className="text-balance text-muted-foreground">
                {t("landing.lead")}
              </Lead>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <LinkButton href="/browse" size="lg">
                {t("landing.primaryGuest")}
                <ArrowRight className="size-4" />
              </LinkButton>
              <LinkButton href={secondaryHref} size="lg" variant="outline">
                {secondaryLabel}
              </LinkButton>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border/60 bg-muted/15 py-10 md:py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-serif text-2xl tracking-tight md:text-3xl">
                {t("landing.featuredTitle")}
              </h2>
              <Muted className="mt-1 text-sm">
                {t("landing.featuredLead")}
              </Muted>
            </div>
            <Link
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "inline-flex shrink-0 gap-2",
              )}
              href="/browse"
            >
              {t("landing.viewAllCollection")}
              <ArrowRight className="size-4" />
            </Link>
          </div>
          {peek.length === 0 ? (
            <Muted>{t("publicCatalog.empty")}</Muted>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {peek.map((dress) => (
                <PublicDressCard
                  dress={dress}
                  hidePrices={hidePrices}
                  key={dress.id}
                  labels={labels}
                  locale={locale}
                />
              ))}
            </div>
          )}
          {branches.length > 0 ? (
            <Muted className="mt-8 text-center text-xs">
              {t("landing.homeBranchesHint", {
                count: String(branches.length),
              })}
            </Muted>
          ) : null}
        </div>
      </section>
    </PublicPageShell>
  );
}
