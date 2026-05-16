import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Muted } from "@/components/ui/typography";
import type { PublicDressRow } from "@/features/public-catalog/server/queries";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

export function PublicDressCard({
  dress,
  locale,
  labels,
  hidePrices = false,
}: {
  dress: PublicDressRow;
  locale: string;
  labels: {
    perDay: string;
    branchSection: string;
  };
  hidePrices?: boolean;
}) {
  const currencyLocale = locale === "ar" ? "ar-EG" : "en-EG";
  const branchLabel = locale === "ar" ? dress.branchNameAr : dress.branchNameEn;
  const cover = dress.images?.[0];

  return (
    <Link
      href={`/collection/${dress.id}`}
      className={cn(
        "group flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm transition-all",
        "hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md",
      )}
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-muted">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote dress URLs (Cloudinary / uploads)
          <img
            alt={dress.title}
            className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            src={cover}
          />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground text-sm">
            —
          </div>
        )}
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <Badge className="bg-background/90 font-mono text-xs text-foreground backdrop-blur-sm">
            {dress.code}
          </Badge>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="space-y-1">
          <h3 className="line-clamp-2 font-medium text-lg leading-snug tracking-tight">
            {dress.title}
          </h3>
          <Muted className="text-xs leading-relaxed">
            {labels.branchSection}: {branchLabel}
          </Muted>
        </div>
        {!hidePrices ? (
          <div className="mt-auto flex flex-wrap items-baseline justify-between gap-2 border-t border-border/60 pt-3">
            <span className="font-semibold text-base tabular-nums">
              {formatCurrency(dress.pricePerDay, currencyLocale)}
            </span>
            <Muted className="text-xs">{labels.perDay}</Muted>
          </div>
        ) : null}
      </div>
    </Link>
  );
}
