import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Lead, Muted } from "@/components/ui/typography";
import { getLocaleCookie, getT } from "@/features/core/i18n/server";
import { listPublicBranches } from "@/features/public-catalog/server/queries";
import { formatBranchHours } from "@/lib/branch-hours";
import { toWhatsAppUrl } from "@/lib/phone";
import { cn } from "@/lib/utils";

export default async function PublicLocationsPage() {
  const { t } = await getT();
  const locale = await getLocaleCookie();
  const branches = await listPublicBranches();

  return (
    <main className="border-t border-border/60 bg-background">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <header className="mb-10 space-y-2">
          <h1 className="font-serif text-3xl tracking-tight md:text-4xl">
            {t("landing.locationsTitle")}
          </h1>
          <Lead className="max-w-2xl text-muted-foreground">
            {t("landing.locationsLead")}
          </Lead>
        </header>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {branches.map((b) => {
            const name = locale === "ar" ? b.nameAr : b.nameEn;
            const address =
              locale === "ar"
                ? (b.addressAr ?? b.addressEn)
                : (b.addressEn ?? b.addressAr);
            const hours = formatBranchHours(b.opensAt, b.closesAt, locale);
            const mapHref = b.mapUrl?.trim();
            const whatsappHref = toWhatsAppUrl(b.phone);

            return (
              <Card className="h-full border-border/80 shadow-sm" key={b.id}>
                <CardHeader className="space-y-3">
                  <CardTitle className="font-serif text-xl">{name}</CardTitle>
                  {address ? (
                    <CardDescription className="text-sm leading-relaxed">
                      {address}
                    </CardDescription>
                  ) : (
                    <Muted className="text-sm">—</Muted>
                  )}
                  <div className="flex flex-wrap gap-3 pt-1">
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
                  {hours ? (
                    <Muted className="text-xs leading-relaxed">{hours}</Muted>
                  ) : null}
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </div>
    </main>
  );
}
