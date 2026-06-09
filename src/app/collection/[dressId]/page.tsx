import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LinkButton } from "@/components/general/link-button";
import { buttonVariants } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { H1, Muted } from "@/components/ui/typography";
import { getLocaleCookie, getT } from "@/features/core/i18n/server";
import { DressAvailabilityChecker } from "@/features/public-catalog/components/dress-availability-checker";
import { PublicDressCoverImage } from "@/features/public-catalog/components/public-dress-cover-image";
import { PublicShell } from "@/features/public-catalog/components/public-shell";
import {
  getPublicCatalogHidePrices,
  getPublicCatalogShowAvailabilityCalendar,
  getPublicCatalogWhatsAppNumber,
  getPublicDressById,
} from "@/features/public-catalog/server/queries";
import { formatBranchHours } from "@/lib/branch-hours";
import { formatCurrency } from "@/lib/format";
import { toWhatsAppUrl } from "@/lib/phone";
import { cn } from "@/lib/utils";

type Props = {
  params: Promise<{ dressId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { dressId } = await params;
  const dress = await getPublicDressById(dressId);
  if (!dress) {
    return { title: "Dress" };
  }
  return {
    title: `${dress.title} · ${dress.code}`,
    description: dress.description ?? undefined,
  };
}

export default async function PublicDressDetailPage({ params }: Props) {
  const { dressId } = await params;
  const [dress, hidePrices, showAvailabilityCalendar, systemWhatsAppNumber] =
    await Promise.all([
      getPublicDressById(dressId),
      getPublicCatalogHidePrices(),
      getPublicCatalogShowAvailabilityCalendar(),
      getPublicCatalogWhatsAppNumber(),
    ]);
  if (!dress) notFound();

  const { t } = await getT();
  const locale = await getLocaleCookie();
  const currencyLocale = locale === "ar" ? "ar-EG" : "en-EG";

  const branchLabel = locale === "ar" ? dress.branchNameAr : dress.branchNameEn;
  const address =
    locale === "ar"
      ? (dress.branchAddressAr ?? dress.branchAddressEn)
      : (dress.branchAddressEn ?? dress.branchAddressAr);
  const hours = formatBranchHours(
    dress.branchOpensAt,
    dress.branchClosesAt,
    locale,
  );

  const fmt = (n: number) => formatCurrency(n, currencyLocale);
  const size = dress.size?.trim() || undefined;
  const color = dress.color?.trim() || undefined;
  const gallery = dress.images?.slice(1) ?? [];
  const mapHref = dress.branchMapUrl?.trim();
  const whatsappHref = toWhatsAppUrl(systemWhatsAppNumber ?? dress.branchPhone);

  return (
    <PublicShell>
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap items-center gap-3">
          <LinkButton href="/#catalog" variant="outline">
            {t("common.back")}
          </LinkButton>
          <Muted className="text-sm">{dress.code}</Muted>
        </div>

        <header className="mb-10 flex flex-wrap items-start gap-4">
          <div className="flex-1 space-y-3">
            <H1 className="font-serif text-4xl tracking-tight md:text-5xl">
              {dress.title}
            </H1>
            <Muted className="text-sm leading-relaxed">
              {t("publicCatalog.detailTitleSuffix")}
            </Muted>
          </div>
        </header>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,320px)_1fr] lg:gap-14">
          <div className="space-y-4">
            <div className="aspect-[3/4] overflow-hidden rounded-2xl border bg-muted shadow-sm">
              <PublicDressCoverImage
                alt={dress.title}
                noImageLabel={t("publicCatalog.noImage")}
                src={dress.images?.[0]}
              />
            </div>
            {gallery.length > 0 ? (
              <div>
                <p className="mb-2 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                  {t("publicCatalog.gallery")}
                </p>
                <ScrollArea className="w-full">
                  <div className="flex gap-2 pb-1">
                    {gallery.map((image, index) => (
                      <div
                        className="size-16 shrink-0 overflow-hidden rounded-lg border bg-muted"
                        key={`${image}-${index}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          alt=""
                          className="size-full object-cover"
                          src={image ?? ""}
                        />
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            ) : null}
          </div>

          <div className="space-y-10">
            <section className="space-y-4 rounded-2xl border border-border/70 bg-muted/20 p-6">
              <h2 className="font-medium text-lg tracking-tight">
                {t("publicCatalog.keyDetails")}
              </h2>
              <Separator />
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground text-xs">
                    {t("publicCatalog.code")}
                  </dt>
                  <dd className="font-medium">{dress.code}</dd>
                </div>
                {size ? (
                  <div>
                    <dt className="text-muted-foreground text-xs">
                      {t("publicCatalog.size")}
                    </dt>
                    <dd className="font-medium">{size}</dd>
                  </div>
                ) : null}
                {color ? (
                  <div>
                    <dt className="text-muted-foreground text-xs">
                      {t("publicCatalog.color")}
                    </dt>
                    <dd className="font-medium">{color}</dd>
                  </div>
                ) : null}
                {!hidePrices ? (
                  <>
                    <div>
                      <dt className="text-muted-foreground text-xs">
                        {t("systemPages.dressesPricePerDay")}
                      </dt>
                      <dd className="font-semibold tabular-nums">
                        {fmt(dress.pricePerDay)}{" "}
                        <span className="font-normal text-muted-foreground text-sm">
                          ({t("publicCatalog.perDay")})
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground text-xs">
                        {t("publicCatalog.depositLabel")}
                      </dt>
                      <dd className="font-medium tabular-nums">
                        {fmt(dress.depositAmount)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground text-xs">
                        {t("publicCatalog.insuranceLabel")}
                      </dt>
                      <dd className="font-medium tabular-nums">
                        {fmt(dress.insurance)}
                      </dd>
                    </div>
                  </>
                ) : null}
              </dl>
              {dress.description ? (
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {dress.description}
                </p>
              ) : null}
              {!hidePrices ? (
                <Muted className="block text-xs leading-relaxed">
                  {t("publicCatalog.staffOnlyNotice")}
                </Muted>
              ) : null}
            </section>

            <section className="space-y-4 rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
              <h2 className="font-medium text-lg tracking-tight">
                {t("publicCatalog.branchSectionTitle")}
              </h2>
              <p className="font-serif text-2xl">{branchLabel}</p>
              {address ? (
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {address}
                </p>
              ) : null}
              {hours ? <Muted className="text-sm">{hours}</Muted> : null}
              <div className="flex flex-wrap gap-2 pt-2">
                {whatsappHref ? (
                  <a
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                      "inline-flex",
                    )}
                    href={whatsappHref}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {t("publicCatalog.whatsappBranch")}
                  </a>
                ) : null}
                {mapHref ? (
                  <a
                    className={cn(
                      buttonVariants({ variant: "secondary", size: "sm" }),
                      "inline-flex",
                    )}
                    href={mapHref}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {t("publicCatalog.mapLink")}
                  </a>
                ) : null}
              </div>
            </section>

            {showAvailabilityCalendar ? (
              <DressAvailabilityChecker
                branchLabel={branchLabel}
                dressId={dress.id}
              />
            ) : null}
          </div>
        </div>
      </main>
    </PublicShell>
  );
}
