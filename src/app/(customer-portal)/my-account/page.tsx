import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { H1, Lead, Muted } from "@/components/ui/typography";
import { getAuth } from "@/features/core/auth/nextjs/actions";
import { getLocaleCookie, getT } from "@/features/core/i18n/server";
import { CustomerAccountActions } from "@/features/customer-portal/components/customer-account-actions";
import { getCustomerPortalData } from "@/features/customer-portal/server/queries";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const statusLabelKey = {
  reserved: "systemPages.reservationStatusReserved",
  pickedUp: "systemPages.reservationStatusPickedUp",
  returned: "systemPages.reservationStatusReturned",
  cancelled: "systemPages.reservationStatusCancelled",
} as const;

export default async function MyAccountPage() {
  const auth = await getAuth();
  if (!auth.isAuthenticated) return null;

  const { t } = await getT();
  const locale = await getLocaleCookie();
  const currencyLocale = locale === "ar" ? "ar-EG" : "en-EG";
  const { stats, reservations } = await getCustomerPortalData(
    auth.session.user.id,
  );

  const fmtMoney = (n: number) => formatCurrency(n, currencyLocale);

  const statCards = [
    {
      label: t("customerPortal.statTotalReservations"),
      value: stats.totalReservations,
    },
    {
      label: t("customerPortal.statActive"),
      value: stats.activeReservations,
    },
    {
      label: t("customerPortal.statCompleted"),
      value: stats.completedReservations,
    },
    {
      label: t("customerPortal.statTotalSpent"),
      value: fmtMoney(stats.totalSpent),
    },
  ];

  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <H1 className="font-serif text-3xl tracking-tight md:text-4xl">
          {t("customerPortal.title")}
        </H1>
        <Lead className="text-muted-foreground">
          {t("customerPortal.lead")}
        </Lead>
        <CustomerAccountActions />
        {!stats.linkedByPhone ? (
          <Muted className="block text-xs leading-relaxed">
            {t("customerPortal.phoneHint")}
          </Muted>
        ) : null}
      </header>

      <section className="scroll-mt-20 space-y-4" id="overview">
        <h2 className="font-medium text-lg tracking-tight">
          {t("customerPortal.overviewTitle")}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {statCards.map((card) => (
            <Card key={card.label} className="border-border/80 shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription>{card.label}</CardDescription>
                <CardTitle className="text-2xl tabular-nums">
                  {card.value}
                </CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section className="scroll-mt-20 space-y-4" id="reservations">
        <h2 className="font-medium text-lg tracking-tight">
          {t("customerPortal.reservationsTitle")}
        </h2>
        {reservations.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center">
              <Muted>{t("customerPortal.reservationsEmpty")}</Muted>
              <Link
                className="mt-4 inline-block text-primary text-sm underline-offset-4 hover:underline"
                href="/#catalog"
              >
                {t("landing.primaryGuest")}
              </Link>
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-3">
            {reservations.map((row) => {
              const branchName =
                locale === "ar" ? row.branchNameAr : row.branchNameEn;
              const statusKey =
                statusLabelKey[row.status as keyof typeof statusLabelKey];
              return (
                <li key={row.id}>
                  <Card className="overflow-hidden border-border/80 shadow-sm">
                    <CardHeader className="gap-2 space-y-0 pb-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <CardTitle className="text-base leading-snug">
                            {row.dressTitle}
                          </CardTitle>
                          <CardDescription className="font-mono text-xs">
                            {row.reservationCode} · {row.dressCode}
                          </CardDescription>
                        </div>
                        <Badge variant="secondary">
                          {statusKey ? t(statusKey) : row.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
                      <div>
                        <Muted className="text-xs">
                          {t("publicCatalog.branchSectionTitle")}
                        </Muted>
                        <p>{branchName}</p>
                      </div>
                      <div>
                        <Muted className="text-xs">
                          {t("customerPortal.occasionDate")}
                        </Muted>
                        <p>
                          {formatDate(row.occasionDate, {}, currencyLocale)}
                        </p>
                      </div>
                      <div>
                        <Muted className="text-xs">
                          {t("customerPortal.totalLabel")}
                        </Muted>
                        <p className="font-medium tabular-nums">
                          {fmtMoney(row.totalPrice)}
                        </p>
                      </div>
                      <div>
                        <Muted className="text-xs">
                          {t("customerPortal.paidLabel")}
                        </Muted>
                        <p className="tabular-nums">
                          {fmtMoney(row.totalPaid)}
                        </p>
                      </div>
                      <Link
                        className={cn(
                          "text-primary text-sm underline-offset-4 hover:underline sm:col-span-2",
                        )}
                        href={`/collection/${row.dressId}`}
                      >
                        {t("customerPortal.viewDress")}
                      </Link>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
