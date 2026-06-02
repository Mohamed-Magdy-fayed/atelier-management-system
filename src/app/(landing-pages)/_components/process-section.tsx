import { Container, Section, SectionHeader } from "@/components/ui/containers";
import { getT } from "@/features/core/i18n/server";

export async function ProcessSection() {
  const { t } = await getT();

  const steps = [
    {
      number: t("publicPages.process.step1Number"),
      title: t("publicPages.process.step1Title"),
      description: t("publicPages.process.step1Description"),
    },
    {
      number: t("publicPages.process.step2Number"),
      title: t("publicPages.process.step2Title"),
      description: t("publicPages.process.step2Description"),
    },
    {
      number: t("publicPages.process.step3Number"),
      title: t("publicPages.process.step3Title"),
      description: t("publicPages.process.step3Description"),
    },
    {
      number: t("publicPages.process.step4Number"),
      title: t("publicPages.process.step4Title"),
      description: t("publicPages.process.step4Description"),
    },
  ];

  return (
    <Section>
      <Container>
        <SectionHeader
          eyebrow={t("publicPages.process.eyebrow")}
          heading={t("publicPages.process.heading")}
          subheading={t("publicPages.process.subheading")}
        />
        <div className="grid gap-8 md:grid-cols-4">
          {steps.map((step, i) => (
            <div key={step.number} className="relative">
              {/* connector line between steps (hidden on mobile) */}
              {i < steps.length - 1 && (
                <div className="bg-border absolute top-5 inset-s-full hidden h-px w-full md:block" />
              )}
              {/* number circle */}
              <div className="bg-primary/10 ring-primary/20 mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full ring-4">
                <span className="text-primary text-sm font-bold">
                  {step.number}
                </span>
              </div>
              <h3 className="mb-2 font-bold">{step.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
