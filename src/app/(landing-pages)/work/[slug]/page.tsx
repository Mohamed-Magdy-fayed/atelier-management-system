import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { ArrowLeftIcon, ExternalLinkIcon } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LinkButton } from "@/components/general/link-button";
import { Badge } from "@/components/ui/badge";
import { Container, Grid, Section } from "@/components/ui/containers";
import { db } from "@/drizzle";
import { CaseStudiesTable } from "@/drizzle/schema";
import { getT } from "@/features/core/i18n/server";
import { api } from "@/integrations/trpc/server";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const slugs = await db
    .select({ slug: CaseStudiesTable.slug })
    .from(CaseStudiesTable)
    .where(
      and(
        eq(CaseStudiesTable.status, "published"),
        isNull(CaseStudiesTable.deletedAt),
      ),
    )
    .orderBy(asc(CaseStudiesTable.sortOrder), desc(CaseStudiesTable.createdAt))
    .catch(() => []);
  return slugs.map((cs) => ({ slug: cs.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const caller = await api();
  const cs = await caller.caseStudies
    .publicGetBySlug({ slug })
    .catch(() => null);
  if (!cs) return {};
  return {
    title: `${cs.title} — ${cs.client}`,
    description: cs.results.summary || cs.problemStatement.slice(0, 155),
    openGraph: cs.coverImageUrl
      ? { images: [{ url: cs.coverImageUrl }] }
      : undefined,
  };
}

export default async function WorkDetailPage({ params }: Props) {
  const { slug } = await params;
  const { t } = await getT();
  const caller = await api();
  const cs = await caller.caseStudies
    .publicGetBySlug({ slug })
    .catch(() => null);

  if (!cs) notFound();

  return (
    <>
      {/* ── Header ── */}
      <Section variant="compact">
        <Container size="narrow">
          <Link
            href="/work"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
          >
            <ArrowLeftIcon className="h-3.5 w-3.5" />
            {t("publicPages.workDetailPage.backToWork")}
          </Link>

          {cs.coverImageUrl && (
            <div className="relative mt-6 h-64 overflow-hidden rounded-xl border md:h-80">
              <Image
                src={cs.coverImageUrl}
                alt={cs.title}
                fill
                className="object-cover"
              />
            </div>
          )}

          <div className="mt-6">
            <Badge variant="secondary">{cs.industry}</Badge>
            <h1 className="mt-3 text-4xl font-bold md:text-5xl">{cs.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-4">
              <p className="text-muted-foreground text-lg">{cs.client}</p>
              {cs.liveUrl && (
                <a
                  href={cs.liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-primary/10 text-primary hover:bg-primary/15 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium transition-colors"
                >
                  <ExternalLinkIcon className="h-3.5 w-3.5" />
                  {t("publicPages.workDetailPage.viewLiveApp")}
                </a>
              )}
            </div>
          </div>
        </Container>
      </Section>

      {/* ── Body ── */}
      <Section>
        <Container size="narrow">
          <div className="space-y-12">
            {/* Challenge */}
            <div>
              <h2 className="text-2xl font-bold">
                {t("publicPages.workDetailPage.challengeHeading")}
              </h2>
              <p className="text-muted-foreground mt-4 leading-relaxed">
                {cs.problemStatement}
              </p>
            </div>

            {/* Solution */}
            <div>
              <h2 className="text-2xl font-bold">
                {t("publicPages.workDetailPage.solutionHeading")}
              </h2>
              <p className="text-muted-foreground mt-4 leading-relaxed">
                {cs.solution}
              </p>
            </div>

            {/* Results */}
            <div>
              <h2 className="text-2xl font-bold">
                {t("publicPages.workDetailPage.resultsHeading")}
              </h2>

              {cs.results.metrics.length > 0 && (
                <Grid cols={3} gap="compact" className="mt-6">
                  {cs.results.metrics.map((metric) => (
                    <div
                      key={metric.label}
                      className="bg-primary/5 rounded-xl border p-5 text-center"
                    >
                      <p className="text-primary text-3xl font-bold">
                        {metric.value}
                      </p>
                      <p className="text-muted-foreground mt-1 text-sm">
                        {metric.label}
                      </p>
                    </div>
                  ))}
                </Grid>
              )}

              {cs.results.summary && (
                <p className="text-muted-foreground mt-6 leading-relaxed">
                  {cs.results.summary}
                </p>
              )}
            </div>
          </div>

          {/* CTA */}
          <div className="mt-16 rounded-xl border bg-muted/30 p-8 text-center">
            <p className="text-lg font-medium">
              {t("publicPages.workDetailPage.ctaDescription")}
            </p>
            <LinkButton href="/contact" size="lg" className="mt-4">
              {t("publicPages.workDetailPage.ctaButton")}
            </LinkButton>
          </div>
        </Container>
      </Section>
    </>
  );
}
