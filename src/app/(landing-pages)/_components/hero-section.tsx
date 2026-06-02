import { ArrowRightIcon } from "lucide-react";

import { LinkButton } from "@/components/general/link-button";
import { Container, HeroContainer, Stat } from "@/components/ui/containers";
import { getT } from "@/features/core/i18n/server";

export async function HeroSection() {
  const { t } = await getT();

  const stats = [
    {
      value: t("publicPages.hero.stat1Value"),
      label: t("publicPages.hero.stat1Label"),
    },
    {
      value: t("publicPages.hero.stat2Value"),
      label: t("publicPages.hero.stat2Label"),
    },
    {
      value: t("publicPages.hero.stat3Value"),
      label: t("publicPages.hero.stat3Label"),
    },
    {
      value: t("publicPages.hero.stat4Value"),
      label: t("publicPages.hero.stat4Label"),
    },
  ];

  return (
    <HeroContainer>
      <Container className="text-center">
        {/* Eyebrow pill */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-muted/60 px-4 py-1.5 text-sm font-medium backdrop-blur-sm">
          <span className="bg-primary h-1.5 w-1.5 rounded-full" />
          {t("publicPages.hero.eyebrow")}
        </div>

        <h1 className="mx-auto max-w-4xl text-balance text-4xl font-extrabold tracking-tight md:text-6xl lg:text-7xl">
          {t("publicPages.hero.heading")}
        </h1>

        <p className="text-muted-foreground mx-auto mt-6 max-w-2xl text-lg md:text-xl">
          {t("publicPages.hero.description")}
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <LinkButton
            href="/contact"
            size="lg"
            className="min-w-[200px] shadow-lg"
          >
            {t("publicPages.hero.ctaContact")}
            <ArrowRightIcon className="ms-2 h-4 w-4" />
          </LinkButton>
          <LinkButton
            href="/work"
            variant="outline"
            size="lg"
            className="min-w-[200px]"
          >
            {t("publicPages.hero.ctaWork")}
          </LinkButton>
        </div>

        {/* Stats row */}
        <div className="mt-16 grid grid-cols-2 gap-x-6 gap-y-6 border-t pt-12 md:grid-cols-4">
          {stats.map((stat) => (
            <Stat key={stat.label} value={stat.value} label={stat.label} />
          ))}
        </div>
      </Container>
    </HeroContainer>
  );
}
