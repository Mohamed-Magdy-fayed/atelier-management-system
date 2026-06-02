import {
  Bot,
  Code,
  Cpu,
  Globe,
  LayoutDashboard,
  type LucideProps,
  Map as MapIcon,
  RefreshCw,
  Settings,
  Zap,
} from "lucide-react";
import type { Metadata } from "next";
import type { ComponentType } from "react";

import { LinkButton } from "@/components/general/link-button";
import {
  Container,
  ContentCard,
  Grid,
  Section,
  SectionHeader,
} from "@/components/ui/containers";
import { getT } from "@/features/core/i18n/server";
import { api } from "@/integrations/trpc/server";

const ICON_MAP: Record<string, ComponentType<LucideProps>> = {
  Bot,
  Code,
  Cpu,
  Globe,
  LayoutDashboard,
  Map: MapIcon,
  RefreshCw,
  Settings,
  Zap,
};

function ServiceIcon({ name }: { name: string }) {
  const Icon = ICON_MAP[name] ?? Zap;
  return <Icon className="text-primary h-10 w-10" />;
}

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: t("publicPages.servicesPage.metaTitle"),
    description: t("publicPages.servicesPage.metaDescription"),
  };
}

export default async function ServicesPage() {
  const { t } = await getT();
  const caller = await api();
  const services = await caller.servicesMgmt.publicList().catch(() => []);

  return (
    <>
      <Section variant="compact">
        <Container className="text-center">
          <h1 className="text-4xl font-bold md:text-5xl">
            {t("publicPages.servicesPage.heading")}
          </h1>
          <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-lg">
            {t("publicPages.servicesPage.subheading")}
          </p>
        </Container>
      </Section>

      <Section>
        <Container>
          <Grid cols={2}>
            {services.map((service) => (
              <ContentCard key={service.id}>
                <div className="mb-4">
                  <ServiceIcon name={service.icon} />
                </div>
                <h2 className="mb-3 text-xl font-bold">{service.title}</h2>
                <p className="text-muted-foreground mb-5 text-sm leading-relaxed">
                  {service.shortDescription}
                </p>
                <ul className="space-y-2">
                  {service.features.map((f) => (
                    <li
                      key={f}
                      className="text-muted-foreground flex items-center gap-2 text-sm"
                    >
                      <span className="text-primary">{"✓"}</span> {f}
                    </li>
                  ))}
                </ul>
              </ContentCard>
            ))}
          </Grid>

          <SectionHeader
            className="mt-16"
            heading={t("publicPages.servicesPage.ctaHeading")}
            subheading={t("publicPages.servicesPage.ctaDescription")}
          />
          <div className="text-center">
            <LinkButton href="/contact" size="lg">
              {t("publicPages.servicesPage.ctaButton")}
            </LinkButton>
          </div>
        </Container>
      </Section>
    </>
  );
}
