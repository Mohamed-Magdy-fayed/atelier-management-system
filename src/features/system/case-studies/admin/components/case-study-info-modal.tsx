"use client";

import { useQuery } from "@tanstack/react-query";
import { ExternalLinkIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "@/features/core/i18n/client";
import { useTRPC } from "@/integrations/trpc/client";
import type { CaseStudyRow } from "@/integrations/trpc/routers/case-studies";

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  draft: "secondary",
  published: "default",
  archived: "outline",
};

type Props = {
  caseStudy: CaseStudyRow | null;
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

export function CaseStudyInfoModal({ caseStudy, onOpenChange, open }: Props) {
  const { t, locale } = useTranslation();
  const trpc = useTRPC();

  const { data: detail } = useQuery({
    ...trpc.caseStudies.getById.queryOptions({ id: caseStudy?.id ?? "" }),
    enabled: open && Boolean(caseStudy?.id),
  });

  const dateFmt = new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const cs = detail ?? caseStudy;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{cs?.title ?? "—"}</DialogTitle>
          <DialogDescription>{cs?.client ?? ""}</DialogDescription>
        </DialogHeader>

        {cs && (
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap gap-2">
              <Badge variant={STATUS_VARIANT[cs.status] ?? "secondary"}>
                {String(t(`work.statusValues.${cs.status}`))}
              </Badge>
              <Badge variant="outline">{cs.industry}</Badge>
              {cs.liveUrl && (
                <a
                  href={cs.liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary inline-flex items-center gap-1 text-xs"
                >
                  <ExternalLinkIcon className="h-3 w-3" />
                  Live App
                </a>
              )}
            </div>

            <Separator />

            {detail && (
              <>
                <div>
                  <p className="text-muted-foreground mb-1 text-xs font-medium uppercase tracking-wide">
                    {String(t("work.problem"))}
                  </p>
                  <p className="leading-relaxed">{detail.problemStatement}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1 text-xs font-medium uppercase tracking-wide">
                    {String(t("work.solution"))}
                  </p>
                  <p className="leading-relaxed">{detail.solution}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">
                    {String(t("work.results"))}
                  </p>
                  {detail.results.metrics.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-3">
                      {detail.results.metrics.map((m) => (
                        <div
                          key={m.label}
                          className="bg-primary/5 rounded-lg border px-3 py-2 text-center"
                        >
                          <p className="text-primary font-bold">{m.value}</p>
                          <p className="text-muted-foreground text-xs">
                            {m.label}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-muted-foreground">
                    {detail.results.summary}
                  </p>
                </div>
              </>
            )}

            <Separator />

            <div className="text-muted-foreground grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="font-medium">
                  {String(t("common.createdAt"))}:
                </span>{" "}
                {cs.createdAt ? dateFmt.format(new Date(cs.createdAt)) : "—"}
              </div>
              <div>
                <span className="font-medium">
                  {String(t("work.sortOrder"))}:
                </span>{" "}
                {cs.sortOrder}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
