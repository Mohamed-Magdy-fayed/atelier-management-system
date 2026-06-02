import { QuoteIcon, StarIcon } from "lucide-react";

import { LinkButton } from "@/components/general/link-button";
import { Container, Section, SectionHeader } from "@/components/ui/containers";
import { getT } from "@/features/core/i18n/server";
import { api } from "@/integrations/trpc/server";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return (parts[0][0] ?? "?").toUpperCase();
  return (
    (parts[0][0] ?? "") + (parts[parts.length - 1][0] ?? "")
  ).toUpperCase();
}

export async function TestimonialsSection() {
  const { t } = await getT();
  const caller = await api();
  const testimonials = await caller.testimonials.publicList().catch(() => []);

  const stats = [
    {
      value: t("publicPages.testimonialsSection.stat1Value"),
      label: t("publicPages.testimonialsSection.stat1Label"),
      description: t("publicPages.testimonialsSection.stat1Description"),
    },
    {
      value: t("publicPages.testimonialsSection.stat2Value"),
      label: t("publicPages.testimonialsSection.stat2Label"),
      description: t("publicPages.testimonialsSection.stat2Description"),
    },
    {
      value: t("publicPages.testimonialsSection.stat3Value"),
      label: t("publicPages.testimonialsSection.stat3Label"),
      description: t("publicPages.testimonialsSection.stat3Description"),
    },
  ];

  if (testimonials.length === 0) return null;

  return (
    <Section variant="muted">
      <Container>
        <SectionHeader
          eyebrow={t("publicPages.testimonialsSection.eyebrow")}
          heading={t("publicPages.testimonialsSection.heading")}
          subheading={t("publicPages.testimonialsSection.subheading")}
        />

        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((client) => (
            <div
              key={client.id}
              className="bg-background relative flex flex-col rounded-xl border p-6 shadow-sm"
            >
              <div className="bg-primary text-primary-foreground absolute -top-3 inset-s-5 flex h-6 w-6 items-center justify-center rounded-full">
                <QuoteIcon className="h-3 w-3" />
              </div>

              <div className="mb-4 flex gap-0.5 pt-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <StarIcon
                    key={i}
                    className="fill-primary text-primary h-4 w-4"
                  />
                ))}
              </div>

              <p className="text-foreground/80 mb-6 flex-1 text-sm leading-relaxed italic">
                &ldquo;{client.content}&rdquo;
              </p>

              <div className="flex items-center gap-3">
                <div className="bg-primary/15 flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                  <span className="text-primary text-sm font-semibold">
                    {getInitials(client.clientName)}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold">{client.clientName}</p>
                  <p className="text-muted-foreground text-xs">
                    {client.role ? `${client.role}, ` : ""}
                    {client.company}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="border-primary/10 bg-primary/5 mt-12 rounded-2xl border p-8">
          <div className="grid gap-8 text-center md:grid-cols-3">
            {stats.map((stat) => (
              <div key={stat.label}>
                <p className="text-primary text-4xl font-bold">{stat.value}</p>
                <p className="mt-1 font-semibold">{stat.label}</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  {stat.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 text-center">
          <LinkButton href="/work" variant="outline" size="lg">
            {t("publicPages.testimonialsSection.viewWork")}
          </LinkButton>
        </div>
      </Container>
    </Section>
  );
}
