import { LinkButton } from "@/components/general/link-button";
import {
  Container,
  Grid,
  Section,
  SectionHeader,
} from "@/components/ui/containers";
import { getT } from "@/features/core/i18n/server";
import { api } from "@/integrations/trpc/server";

import { WorkCaseCard } from "./work-case-card";

export async function WorkPreviewSection() {
  const { t } = await getT();
  const caller = await api();
  const cases = await caller.caseStudies.publicList().catch(() => []);
  const preview = cases.slice(0, 3);

  if (preview.length === 0) return null;

  return (
    <Section>
      <Container>
        <SectionHeader
          eyebrow={t("publicPages.workPreview.eyebrow")}
          heading={t("publicPages.workPreview.heading")}
          subheading={t("publicPages.workPreview.subheading")}
        />
        <Grid cols={3}>
          {preview.map((cs) => (
            <WorkCaseCard key={cs.slug} cs={cs} variant="preview" />
          ))}
        </Grid>
        <div className="mt-10 text-center">
          <LinkButton href="/work" variant="outline" size="lg">
            {t("publicPages.workPreview.viewAll")}
          </LinkButton>
        </div>
      </Container>
    </Section>
  );
}
