import { Search, TrendingUp, Wrench } from "lucide-react";

import {
  Container,
  Grid,
  Section,
  SectionHeader,
} from "@/components/ui/containers";
import { getT } from "@/features/core/i18n/server";

const STEP_ICONS = [Search, Wrench, TrendingUp];

export async function ValuePropositionSection() {
  const { t } = await getT();

  const steps = [
    {
      label: t("publicPages.valueProposition.step1Label"),
      title: t("publicPages.valueProposition.step1Title"),
      description: t("publicPages.valueProposition.step1Description"),
    },
    {
      label: t("publicPages.valueProposition.step2Label"),
      title: t("publicPages.valueProposition.step2Title"),
      description: t("publicPages.valueProposition.step2Description"),
    },
    {
      label: t("publicPages.valueProposition.step3Label"),
      title: t("publicPages.valueProposition.step3Title"),
      description: t("publicPages.valueProposition.step3Description"),
    },
  ];

  return (
    <Section variant="muted">
      <Container>
        <SectionHeader
          eyebrow={t("publicPages.valueProposition.eyebrow")}
          heading={t("publicPages.valueProposition.heading")}
          subheading={t("publicPages.valueProposition.subheading")}
        />
        <Grid cols={3}>
          {steps.map((step, i) => {
            const Icon = STEP_ICONS[i];
            return (
              <div
                key={step.title}
                className="bg-background relative rounded-xl border p-6 shadow-sm"
              >
                {/* floating step number */}
                <div className="bg-primary text-primary-foreground absolute -top-3 inset-s-5 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold shadow">
                  {i + 1}
                </div>
                <div className="bg-primary/10 mb-4 mt-2 inline-flex h-11 w-11 items-center justify-center rounded-lg">
                  <Icon className="text-primary h-5 w-5" />
                </div>
                <p className="text-muted-foreground mb-1 text-xs font-semibold uppercase tracking-widest">
                  {step.label}
                </p>
                <h3 className="mb-2 text-lg font-bold">{step.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>
            );
          })}
        </Grid>
      </Container>
    </Section>
  );
}
