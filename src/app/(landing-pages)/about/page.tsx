import type { Metadata } from "next";

import { LinkButton } from "@/components/general/link-button";
import { Container, Grid, Section } from "@/components/ui/containers";
import { getT } from "@/features/core/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: t("publicPages.aboutPage.metaTitle"),
    description: t("publicPages.aboutPage.metaDescription"),
  };
}

export default async function AboutPage() {
  const { t } = await getT();

  const values = [
    {
      title: t("publicPages.aboutPage.value1Title"),
      desc: t("publicPages.aboutPage.value1Description"),
    },
    {
      title: t("publicPages.aboutPage.value2Title"),
      desc: t("publicPages.aboutPage.value2Description"),
    },
    {
      title: t("publicPages.aboutPage.value3Title"),
      desc: t("publicPages.aboutPage.value3Description"),
    },
  ];

  return (
    <Section>
      <Container size="narrow">
        <h1 className="text-4xl font-bold md:text-5xl">
          {t("publicPages.aboutPage.heading")}
        </h1>
        <p className="text-muted-foreground mt-6 text-lg leading-relaxed">
          {t("publicPages.aboutPage.intro")}
        </p>

        <div className="mt-12 space-y-8">
          <div>
            <h2 className="mb-3 text-2xl font-bold">
              {t("publicPages.aboutPage.problemHeading")}
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {t("publicPages.aboutPage.problemDescription")}
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-2xl font-bold">
              {t("publicPages.aboutPage.whatWeDoHeading")}
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {t("publicPages.aboutPage.whatWeDoDescription")}
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-2xl font-bold">
              {t("publicPages.aboutPage.valuesHeading")}
            </h2>
            <Grid cols={3} gap="compact">
              {values.map((v) => (
                <div key={v.title} className="rounded-lg border p-5">
                  <h3 className="mb-2 font-semibold">{v.title}</h3>
                  <p className="text-muted-foreground text-sm">{v.desc}</p>
                </div>
              ))}
            </Grid>
          </div>
        </div>

        <div className="mt-12">
          <LinkButton href="/contact" size="lg">
            {t("publicPages.aboutPage.cta")}
          </LinkButton>
        </div>
      </Container>
    </Section>
  );
}
