import { ArrowRightIcon, ExternalLinkIcon } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import type { CaseStudyResults } from "@/drizzle/schema";
import { getT } from "@/features/core/i18n/server";

export type WorkCase = {
  slug: string;
  client: string;
  industry: string;
  problemStatement: string;
  solution: string;
  results: CaseStudyResults;
  liveUrl: string | null;
};

type Props = {
  cs: WorkCase;
  variant: "preview" | "full";
};

export async function WorkCaseCard({ cs, variant }: Props) {
  const { t } = await getT();
  const firstMetric = cs.results.metrics[0];

  if (variant === "preview") {
    return (
      <div className="group bg-background relative flex flex-col overflow-hidden rounded-xl border shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:ring-1 hover:ring-primary/20">
        {firstMetric && (
          <div className="bg-primary/8 border-b px-5 py-3">
            <p className="text-primary text-sm font-semibold">
              {"✦"} {firstMetric.value} — {firstMetric.label}
            </p>
          </div>
        )}
        <div className="flex flex-1 flex-col p-5">
          <Badge variant="secondary" className="mb-3 w-fit">
            {cs.industry}
          </Badge>
          <h3 className="mb-2 font-bold transition-colors group-hover:text-primary">
            {cs.client}
          </h3>
          <p className="text-muted-foreground flex-1 text-sm leading-relaxed">
            {cs.problemStatement}
          </p>
          <div className="mt-4 flex items-center justify-between gap-2">
            <Link
              href={`/work/${cs.slug}`}
              className="flex items-center gap-1 text-sm font-medium text-primary"
            >
              <span>{t("common.readMore")}</span>
              <ArrowRightIcon className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </Link>
            {cs.liveUrl && (
              <Link
                href={cs.liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs font-medium transition-colors"
              >
                <ExternalLinkIcon className="h-3 w-3" />
                {t("publicPages.workDetailPage.viewLiveApp")}
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background rounded-xl border p-8 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">{cs.client}</h2>
          <Badge variant="secondary" className="mt-1">
            {cs.industry}
          </Badge>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          {firstMetric && (
            <p className="text-primary font-bold">→ {firstMetric.value} {firstMetric.label}</p>
          )}
          {cs.liveUrl && (
            <a
              href={cs.liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary flex items-center gap-1.5 text-sm font-medium transition-colors"
            >
              <ExternalLinkIcon className="h-3.5 w-3.5" />
              {t("publicPages.workDetailPage.viewLiveApp")}
            </a>
          )}
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide">
            {t("publicPages.workPage.challengeLabel")}
          </p>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {cs.problemStatement}
          </p>
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide">
            {t("publicPages.workPage.solutionLabel")}
          </p>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {cs.solution}
          </p>
        </div>
      </div>
      <div className="mt-5">
        <Link
          href={`/work/${cs.slug}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary"
        >
          {t("common.readMore")}
          <ArrowRightIcon className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
