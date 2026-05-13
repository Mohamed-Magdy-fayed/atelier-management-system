import { and, count, eq, gte, isNotNull, isNull } from "drizzle-orm";

import { LinkButton } from "@/components/general/link-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { H2, Lead, Muted } from "@/components/ui/typography";
import { db } from "@/drizzle";
import { BranchesTable, UsersTable } from "@/drizzle/schema";
import { getT } from "@/features/core/i18n/server";
import { getLocaleCookie } from "@/features/core/i18n/server";

export default async function DashboardPage() {
  const { t } = await getT();
  const locale = await getLocaleCookie();
  const formatNumber = new Intl.NumberFormat(locale);
  const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1_000);

  const [
    [{ value: branchCountRaw }],
    [{ value: employeeCountRaw }],
    [{ value: customerCountRaw }],
    [{ value: verifiedCustomerCountRaw }],
    [{ value: recentSignInCountRaw }],
  ] = await Promise.all([
    db.select({ value: count() }).from(BranchesTable),
    db
      .select({ value: count() })
      .from(UsersTable)
      .where(and(eq(UsersTable.role, "employee"), isNull(UsersTable.deletedAt))),
    db
      .select({ value: count() })
      .from(UsersTable)
      .where(and(eq(UsersTable.role, "customer"), isNull(UsersTable.deletedAt))),
    db
      .select({ value: count() })
      .from(UsersTable)
      .where(
        and(
          eq(UsersTable.role, "customer"),
          isNull(UsersTable.deletedAt),
          isNotNull(UsersTable.emailVerifiedAt),
        ),
      ),
    db
      .select({ value: count() })
      .from(UsersTable)
      .where(and(isNull(UsersTable.deletedAt), gte(UsersTable.lastSignInAt, last30Days))),
  ]);

  const branchCount = Number(branchCountRaw);
  const employeeCount = Number(employeeCountRaw);
  const customerCount = Number(customerCountRaw);
  const verifiedCustomerCount = Number(verifiedCustomerCountRaw);
  const recentSignInCount = Number(recentSignInCountRaw);
  const verificationCoverage = customerCount
    ? Math.round((verifiedCustomerCount / customerCount) * 100)
    : 0;

  const metrics = [
    {
      title: t("systemPages.dashboardBranchesTitle"),
      description: t("systemPages.dashboardBranchesDescription"),
      value: formatNumber.format(branchCount),
    },
    {
      title: t("systemPages.dashboardEmployeesTitle"),
      description: t("systemPages.dashboardEmployeesDescription"),
      value: formatNumber.format(employeeCount),
    },
    {
      title: t("systemPages.dashboardCustomersTitle"),
      description: t("systemPages.dashboardCustomersDescription"),
      value: formatNumber.format(customerCount),
    },
    {
      title: t("systemPages.dashboardVerifiedTitle"),
      description: t("systemPages.dashboardVerifiedDescription"),
      value: formatNumber.format(verifiedCustomerCount),
    },
    {
      title: t("systemPages.dashboardRecentSignInsTitle"),
      description: t("systemPages.dashboardRecentSignInsDescription"),
      value: formatNumber.format(recentSignInCount),
    },
    {
      title: t("systemPages.dashboardCoverageTitle"),
      description: t("systemPages.dashboardCoverageDescription"),
      value: `${formatNumber.format(verificationCoverage)}%`,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <div className="space-y-1">
        <H2>{String(t("systemPages.dashboardTitle"))}</H2>
        <Lead>{String(t("systemPages.dashboardLead"))}</Lead>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <Card key={metric.title}>
            <CardHeader className="space-y-2">
              <CardDescription>{metric.title}</CardDescription>
              <CardTitle className="text-3xl">{metric.value}</CardTitle>
            </CardHeader>
            <CardContent>
              <Muted className="leading-6">{metric.description}</Muted>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)]">
        <Card>
          <CardHeader>
            <CardTitle>{t("systemPages.dashboardInsightsTitle")}</CardTitle>
            <CardDescription>
              {t("systemPages.dashboardInsightsLead")}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border bg-muted/40 p-4">
              <div className="font-medium">{t("systemPages.dashboardBranchesTitle")}</div>
              <Muted className="mt-2 leading-6">
                {t("systemPages.dashboardBranchesDescription")}
              </Muted>
            </div>
            <div className="rounded-xl border bg-muted/40 p-4">
              <div className="font-medium">{t("systemPages.dashboardEmployeesTitle")}</div>
              <Muted className="mt-2 leading-6">
                {t("systemPages.dashboardEmployeesDescription")}
              </Muted>
            </div>
            <div className="rounded-xl border bg-muted/40 p-4">
              <div className="font-medium">{t("systemPages.dashboardCustomersTitle")}</div>
              <Muted className="mt-2 leading-6">
                {t("systemPages.dashboardCustomersDescription")}
              </Muted>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("systemPages.dashboardActionsTitle")}</CardTitle>
            <CardDescription>
              {t("systemPages.dashboardActionsDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <LinkButton href="/branches" variant="outline" size="sm">
              {t("systemPages.dashboardActionsBranches")}
            </LinkButton>
            <LinkButton href="/customers" variant="outline" size="sm">
              {t("systemPages.dashboardActionsCustomers")}
            </LinkButton>
            <LinkButton href="/employees" variant="outline" size="sm">
              {t("systemPages.dashboardActionsEmployees")}
            </LinkButton>
            <LinkButton href="/customers" variant="outline" size="sm">
              {t("systemPages.dashboardActionsCoverage")}
            </LinkButton>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
