"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CalendarCheck2,
  CalendarDays,
  CalendarPlus,
  CreditCard,
  PiggyBank,
  Shirt,
  TrendingDown,
  TrendingUp,
  UserPlus2,
  Users2,
  Wallet,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import type { DateRange } from "react-day-picker";

import { LinkButton } from "@/components/general/link-button";
import { SelectDateField } from "@/components/general/select-date-field";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { H2, Muted } from "@/components/ui/typography";
import { useBranch } from "@/features/core/auth/nextjs/components/branch-provider";
import { useActiveBranchId } from "@/features/core/auth/nextjs/hooks/use-active-branch-id";
import { useTranslation } from "@/features/core/i18n/client";
import {
  endOfDay,
  startOfDay,
  subDays,
} from "@/features/system/dashboard/lib/dates";
import { DressViewDialog } from "@/features/system/dresses/admin/components/dress-view-dialog";
import { useTRPC } from "@/integrations/trpc/client";
import type { DateRangePreset } from "@/lib/date-range";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

function formatLocalIso(date: Date) {
  return date.toISOString();
}

function buildRangeParams(range: DateRange | undefined) {
  return {
    from: range?.from ? formatLocalIso(startOfDay(range.from)) : undefined,
    to: range?.to ? formatLocalIso(endOfDay(range.to)) : undefined,
  } as const;
}

function formatPercentage(value: number) {
  return `${value > 0 ? "+" : value < 0 ? "-" : ""}${Math.abs(value).toFixed(1)}%`;
}

function DeltaBadge({
  current,
  previous,
}: {
  current: number;
  previous: number;
}) {
  if (previous === 0 && current === 0) return null;
  const pct =
    previous > 0
      ? ((current - previous) / previous) * 100
      : current > 0
        ? 100
        : null;
  if (pct === null) return null;
  const up = pct > 0;
  const neutral = pct === 0;
  return (
    <div
      className={cn(
        "flex items-center gap-0.5 text-xs font-medium",
        neutral
          ? "text-muted-foreground"
          : up
            ? "text-emerald-600"
            : "text-destructive",
      )}
    >
      {!neutral &&
        (up ? (
          <ArrowUpRight className="size-3" />
        ) : (
          <ArrowDownRight className="size-3" />
        ))}
      <span>{formatPercentage(pct)}</span>
    </div>
  );
}

export function DashboardRentalPage() {
  const { t, locale } = useTranslation();
  const trpc = useTRPC();
  const branchId = useActiveBranchId();
  const branchState = useBranch();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const dr = (key: string, args?: Record<string, string | number>) =>
    String(
      (t as (k: string, a?: Record<string, string | number>) => string)(
        `systemPages.dashboardRental.${key}`,
        args,
      ),
    );

  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;

  // Every figure below is scoped to one branch unless the admin picked "all
  // branches". Without this label the numbers look like company-wide totals.
  const activeBranch = branchState?.hasActiveOrg
    ? branchState.activeBranch
    : undefined;
  const branchScopeLabel = activeBranch
    ? locale === "ar"
      ? activeBranch.nameAr
      : activeBranch.nameEn
    : branchState?.canViewAllBranches
      ? String(t("authTranslations.branch.switcher.allBranches"))
      : dr("scopeNoBranch");

  const { data, isPending, error, refetch } = useQuery(
    trpc.dashboard.getData.queryOptions({ branchId, from, to }),
  );

  const rangePresets = useMemo((): DateRangePreset[] => {
    const now = new Date();
    return [
      {
        id: "today",
        label: String(t("common.today")),
        getRange: () => ({ from: startOfDay(now), to: endOfDay(now) }),
      },
      {
        id: "yesterday",
        label: String(t("common.yesterday")),
        getRange: () => {
          const day = subDays(now, 1);
          return { from: startOfDay(day), to: endOfDay(day) };
        },
      },
      {
        id: "last7",
        label: String(t("common.last7Days")),
        getRange: () => ({
          from: startOfDay(subDays(now, 6)),
          to: endOfDay(now),
        }),
      },
      {
        id: "last30",
        label: String(t("common.last30Days")),
        getRange: () => ({
          from: startOfDay(subDays(now, 29)),
          to: endOfDay(now),
        }),
      },
      {
        id: "last90",
        label: String(t("systemPages.dashboardRental.rangeLast3Months")),
        getRange: () => ({
          from: startOfDay(subDays(now, 89)),
          to: endOfDay(now),
        }),
      },
    ];
  }, [t]);

  // The URL is the single source of truth for the range: the server query reads
  // `from`/`to` from it, so the picker must too, or a reload shows a range that
  // does not match the figures. Defaults mirror `parseDashboardRange`.
  const selectedRange = useMemo((): DateRange => {
    const parsedFrom = from ? new Date(from) : null;
    const parsedTo = to ? new Date(to) : null;
    const now = new Date();
    return {
      from:
        parsedFrom && !Number.isNaN(parsedFrom.getTime())
          ? startOfDay(parsedFrom)
          : startOfDay(subDays(now, 29)),
      to:
        parsedTo && !Number.isNaN(parsedTo.getTime())
          ? endOfDay(parsedTo)
          : endOfDay(now),
    };
  }, [from, to]);

  const syncSearchParams = useCallback(
    (nextRange: DateRange | undefined) => {
      const params = new URLSearchParams(searchParams.toString());
      const nextParams = buildRangeParams(nextRange);
      if (nextParams.from) params.set("from", nextParams.from);
      else params.delete("from");
      if (nextParams.to) params.set("to", nextParams.to);
      else params.delete("to");
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

  const numberFormatter = useMemo(
    () => new Intl.NumberFormat(locale),
    [locale],
  );
  const fmtMoney = (n: number) => formatCurrency(n, locale);

  const expenseTypeLabels: Record<string, string> = {
    drycleaning: String(t("systemPages.expenseTypeDrycleaning")),
    tailoring: String(t("systemPages.expenseTypeTailoring")),
    dressAcquisition: String(t("systemPages.expenseTypeDressAcquisition")),
    salary: String(t("systemPages.expenseTypeSalary")),
    custom: String(t("systemPages.expenseTypeCustom")),
  };

  const paymentMethodLabels: Record<string, string> = {
    cash: String(t("systemPages.paymentMethodCash")),
    instapay: String(t("systemPages.paymentMethodInstapay")),
    visa: String(t("systemPages.paymentMethodVisa")),
    mobileWallet: String(t("systemPages.paymentMethodMobileWallet")),
  };

  if (error) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
        <Alert variant="destructive">
          <AlertTitle>{dr("errorLoading")}</AlertTitle>
          <AlertDescription className="flex items-center gap-2">
            <span>{error.message}</span>
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              {dr("retry")}
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const summary = data?.summary;
  const rangeStats = data?.rangeStats;

  const primaryKpiCards = [
    {
      id: "range-revenue",
      title: dr("rangeRevenue"),
      value: rangeStats ? fmtMoney(rangeStats.totalRevenue) : "—",
      icon: PiggyBank,
      current: rangeStats?.totalRevenue ?? 0,
      previous: rangeStats?.prevRevenue ?? 0,
    },
    {
      id: "range-net-profit",
      title: dr("rangeNetProfit"),
      value: rangeStats ? fmtMoney(rangeStats.netProfit) : "—",
      icon: TrendingUp,
      current: rangeStats?.netProfit ?? 0,
      previous: rangeStats
        ? rangeStats.prevRevenue - rangeStats.prevExpenses
        : 0,
      highlight: (rangeStats?.netProfit ?? 0) < 0,
      // Revenue is windowed on when the payment was recorded, expenses on the
      // date typed into the expense. Say so rather than let the two look
      // interchangeable.
      note: dr("rangeNetProfitBasis"),
    },
    {
      id: "range-expenses",
      title: dr("rangeExpenses"),
      value: rangeStats ? fmtMoney(rangeStats.totalExpenses) : "—",
      icon: TrendingDown,
      current: rangeStats?.totalExpenses ?? 0,
      previous: rangeStats?.prevExpenses ?? 0,
    },
    {
      id: "range-reservations",
      title: dr("rangeReservations"),
      value: rangeStats
        ? numberFormatter.format(rangeStats.reservationsCount)
        : "—",
      icon: CalendarCheck2,
      current: rangeStats?.reservationsCount ?? 0,
      previous: rangeStats?.prevReservations ?? 0,
    },
  ];

  const liveStats = summary
    ? [
        {
          label: dr("liveDressesAvailable"),
          value: summary.dressesAvailable,
          variant: "default" as const,
        },
        {
          // Dresses physically with a customer right now. Split out from
          // "Available" because the stored dress status never reflects rentals.
          label: dr("liveDressesOut"),
          value: summary.dressesOut,
          variant: "secondary" as const,
          hint:
            summary.dressUtilizationRate != null
              ? dr("liveUtilization", {
                  value: summary.dressUtilizationRate.toFixed(0),
                })
              : undefined,
        },
        {
          label: dr("liveDressesAtTailor"),
          value: summary.dressesAtTailor,
          variant: "outline" as const,
        },
        {
          label: dr("liveDressesAtDryCleaner"),
          value: summary.dressesAtDryCleaner,
          variant: "outline" as const,
        },
        {
          label: dr("liveDressesUnderRepair"),
          value: summary.dressesUnderRepair,
          destructive: summary.dressesUnderRepair > 0,
        },
        {
          label: dr("liveActiveReservations"),
          value: summary.activeReservations,
          variant: "secondary" as const,
        },
        {
          label: dr("liveOverdueReturns"),
          value: summary.overdueReturns,
          destructive: summary.overdueReturns > 0,
        },
        {
          label: dr("liveUpcomingPickups"),
          value: summary.upcomingPickups,
          variant: "secondary" as const,
        },
      ]
    : [];

  const quickActions = summary
    ? [
        {
          id: "reservations",
          title: String(t("systemPages.navReservations")),
          href: "/reservations",
          icon: CalendarPlus,
          badge: dr("quickActionsReservationsBadge", {
            count: summary.completedReservations,
          }),
        },
        {
          id: "dresses",
          title: String(t("systemPages.navDresses")),
          href: "/dresses",
          icon: Shirt,
          badge: dr("quickActionsDressesBadge", {
            count: summary.activeDresses,
          }),
        },
        {
          id: "customers",
          title: String(t("systemPages.navCustomers")),
          href: "/rental-customers",
          icon: Users2,
          badge: dr("quickActionsCustomersBadge", {
            count: summary.customerCount,
          }),
        },
        {
          id: "employees",
          title: String(t("systemPages.navEmployees")),
          href: "/employees",
          icon: UserPlus2,
          badge: dr("quickActionsEmployeesBadge", {
            count: summary.employeeCount,
          }),
        },
        {
          id: "payments",
          title: String(t("systemPages.navPayments")),
          href: "/payments",
          icon: CreditCard,
          badge: dr("quickActionsPaymentsBadge", {
            count: summary.paymentsCount,
          }),
        },
      ]
    : [];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      {/* Page header — title + date range picker */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <H2>{String(t("systemPages.dashboardTitle"))}</H2>
          <Muted>{String(t("systemPages.dashboardLead"))}</Muted>
        </div>
        <SelectDateField
          className="w-full shrink-0 sm:w-auto sm:min-w-[220px]"
          mode="range"
          numberOfMonths={1}
          rangePresets={rangePresets}
          title={dr("rangeDateRange")}
          value={selectedRange}
          setValue={(value) => {
            if (!value || Array.isArray(value) || value instanceof Date) {
              return;
            }
            syncSearchParams(value);
          }}
        />
      </div>

      {/* Primary KPIs — all date-range driven */}
      <section className="space-y-3">
        <div className="space-y-0.5">
          <p className="text-sm font-semibold">{dr("primaryKpisTitle")}</p>
          <Muted className="text-xs">
            {dr("primaryKpisDescription")}{" "}
            {dr("scopeHint", { branch: branchScopeLabel })}
          </Muted>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {isPending && !rangeStats
            ? (["r1", "r2", "r3", "r4"] as const).map((k) => (
                <Card key={k} className="animate-pulse">
                  <CardHeader className="pb-2">
                    <div className="h-3 w-24 rounded bg-muted" />
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="h-7 w-28 rounded bg-muted" />
                  </CardContent>
                </Card>
              ))
            : primaryKpiCards.map((card) => (
                <Card
                  key={card.id}
                  className={cn(
                    "transition hover:shadow-md",
                    card.highlight && "border-destructive/40 bg-destructive/5",
                  )}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        {card.title}
                      </CardTitle>
                      <card.icon className="size-4 shrink-0 text-muted-foreground" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="text-2xl font-semibold tracking-tight">
                      {card.value}
                    </div>
                    <DeltaBadge
                      current={card.current}
                      previous={card.previous}
                    />
                    <Muted className="text-xs">{dr("rangeVsPrevPeriod")}</Muted>
                    {card.note && (
                      <Muted className="block text-[10px] leading-snug">
                        {card.note}
                      </Muted>
                    )}
                  </CardContent>
                </Card>
              ))}
        </div>
      </section>

      {/* Secondary KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {/* New customers */}
        <Card className="transition hover:shadow-md">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {dr("rangeNewCustomers")}
              </CardTitle>
              <UserPlus2 className="size-4 shrink-0 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-semibold tracking-tight">
              {rangeStats
                ? numberFormatter.format(rangeStats.newCustomers)
                : isPending
                  ? "—"
                  : "0"}
            </div>
            {rangeStats && (
              <DeltaBadge
                current={rangeStats.newCustomers}
                previous={rangeStats.prevNewCustomers}
              />
            )}
            <Muted className="text-xs">{dr("rangeVsPrevPeriod")}</Muted>
          </CardContent>
        </Card>

        {/* Avg order value */}
        <Card className="transition hover:shadow-md">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {dr("rangeAvgOrder")}
              </CardTitle>
              <Wallet className="size-4 shrink-0 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-semibold tracking-tight">
              {rangeStats?.averageReservationValue != null
                ? fmtMoney(rangeStats.averageReservationValue)
                : isPending
                  ? "—"
                  : dr("rangeNotEnoughData")}
            </div>
          </CardContent>
        </Card>

        {/* Cancellation rate */}
        <Card className="transition hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {dr("rangeCancellationRate")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-semibold tracking-tight">
              {rangeStats?.cancellationRate != null
                ? `${rangeStats.cancellationRate.toFixed(1)}%`
                : isPending
                  ? "—"
                  : "0%"}
            </div>
            {(rangeStats?.cancellations ?? 0) > 0 && (
              <Badge variant="secondary">
                {dr("rangeCancellations", {
                  count: rangeStats?.cancellations ?? 0,
                })}
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* Outstanding balance — live metric */}
        <Card
          className={cn(
            "transition hover:shadow-md",
            (data?.totalOutstanding ?? 0) > 0 &&
              "border-destructive/40 bg-destructive/5",
          )}
        >
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {dr("rangeOutstandingBalance")}
              </CardTitle>
              <AlertTriangle className="size-4 shrink-0 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div
              className={cn(
                "text-2xl font-semibold tracking-tight",
                (data?.totalOutstanding ?? 0) > 0 && "text-destructive",
              )}
            >
              {data ? fmtMoney(data.totalOutstanding) : "—"}
            </div>
            <Badge variant="outline">{dr("liveLabel")}</Badge>
            {(data?.totalOutstandingCount ?? 0) > 0 && (
              <Muted className="text-xs">
                {dr("outstandingAcross", {
                  count: data?.totalOutstandingCount ?? 0,
                })}
              </Muted>
            )}
            {(data?.overdueOutstanding ?? 0) > 0 && (
              <Muted className="block text-xs text-destructive">
                {dr("outstandingOverdue", {
                  value: fmtMoney(data?.overdueOutstanding ?? 0),
                  count: data?.overdueOutstandingCount ?? 0,
                })}
              </Muted>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Live operational status */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-block size-2 animate-pulse rounded-full bg-emerald-500" />
          <p className="text-sm font-semibold">{dr("liveOperationalTitle")}</p>
          <Muted className="text-xs">{dr("liveOperationalDescription")}</Muted>
        </div>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-8">
          {isPending && liveStats.length === 0
            ? (["l1", "l2", "l3", "l4", "l5", "l6", "l7", "l8"] as const).map(
                (k) => (
                  <Card key={k} className="animate-pulse">
                    <CardContent className="pt-4">
                      <div className="h-6 w-10 rounded bg-muted" />
                      <div className="mt-2 h-3 w-16 rounded bg-muted" />
                    </CardContent>
                  </Card>
                ),
              )
            : liveStats.map((stat) => (
                <Card
                  key={stat.label}
                  className={cn(
                    stat.destructive &&
                      "border-destructive/40 bg-destructive/5",
                  )}
                >
                  <CardContent className="pt-4">
                    <div
                      className={cn(
                        "text-xl font-bold",
                        stat.destructive && "text-destructive",
                      )}
                    >
                      {numberFormatter.format(stat.value)}
                    </div>
                    <Muted className="mt-1 block text-xs">{stat.label}</Muted>
                    {stat.hint && (
                      <Muted className="mt-0.5 block text-[10px]">
                        {stat.hint}
                      </Muted>
                    )}
                  </CardContent>
                </Card>
              ))}
        </div>
      </section>

      {/* Upcoming reservations + Outstanding payments */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="overflow-x-auto">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">
              {dr("upcomingTitle")}
            </CardTitle>
            <CardDescription>{dr("upcomingDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            {data?.upcomingReservations &&
            data.upcomingReservations.length > 0 ? (
              <div className="overflow-hidden rounded-md border">
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="px-2">
                        {String(t("systemPages.reservationsCode"))}
                      </TableHead>
                      <TableHead className="px-2">
                        {String(t("systemPages.reservationsDress"))}
                      </TableHead>
                      <TableHead className="px-2">
                        {String(t("systemPages.reservationsCustomerName"))}
                      </TableHead>
                      <TableHead className="px-2">{dr("pickup")}</TableHead>
                      <TableHead className="px-2">{dr("employee")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.upcomingReservations.map((reservation) => (
                      <TableRow key={reservation.id}>
                        <TableCell className="font-medium">
                          {reservation.reservationCode}
                        </TableCell>
                        <TableCell>
                          <DressViewDialog
                            dressId={reservation.dressId}
                            dressLabel={reservation.dressTitle}
                          />
                        </TableCell>
                        <TableCell>{reservation.customerName}</TableCell>
                        <TableCell>
                          {formatDate(
                            reservation.receivingDateTime,
                            {
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                            },
                            locale,
                          )}
                        </TableCell>
                        <TableCell>{reservation.employee ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <Muted className="rounded-lg border border-dashed p-6 text-sm">
                {isPending ? String(t("common.loading")) : dr("upcomingEmpty")}
              </Muted>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-x-auto">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">
              {dr("outstandingTitle")}
            </CardTitle>
            <CardDescription>{dr("outstandingDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            {data?.outstandingReservations &&
            data.outstandingReservations.length > 0 ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">
                    {dr("outstandingTotal")}: {fmtMoney(data.totalOutstanding)}
                  </Badge>
                  {data.totalOutstandingCount >
                    data.outstandingReservations.length && (
                    <Muted className="text-xs">
                      {dr("outstandingShowing", {
                        shown: data.outstandingReservations.length,
                        total: data.totalOutstandingCount,
                      })}
                    </Muted>
                  )}
                </div>
                <div className="overflow-hidden rounded-md border">
                  <Table className="text-xs">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="px-2">
                          {String(t("systemPages.reservationsCode"))}
                        </TableHead>
                        <TableHead className="px-2">
                          {String(t("systemPages.reservationsCustomerName"))}
                        </TableHead>
                        <TableHead className="px-2">{dr("dueDate")}</TableHead>
                        <TableHead className="px-2">
                          {dr("remaining")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.outstandingReservations.map((reservation) => (
                        <TableRow key={reservation.id}>
                          <TableCell className="font-medium">
                            {reservation.reservationCode}
                          </TableCell>
                          <TableCell>{reservation.customerName}</TableCell>
                          <TableCell>
                            {formatDate(
                              reservation.dueDate,
                              {
                                month: "short",
                                day: "numeric",
                              },
                              locale,
                            )}
                          </TableCell>
                          <TableCell>
                            {fmtMoney(reservation.remaining)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : (
              <Muted className="rounded-lg border border-dashed p-6 text-sm">
                {isPending
                  ? String(t("common.loading"))
                  : dr("outstandingEmpty")}
              </Muted>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top dresses (range) + Upcoming occasions */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              {dr("topDressesRangeTitle")}
            </CardTitle>
            <CardDescription>
              {dr("topDressesRangeDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data?.topDresses && data.topDresses.length > 0 ? (
              <div className="space-y-3">
                {data.topDresses.map((dress) => (
                  <div
                    key={dress.id}
                    className="flex items-center justify-between gap-2 rounded-lg border p-3"
                  >
                    <div>
                      <div className="text-sm font-medium">{dress.title}</div>
                      <Muted className="text-xs">
                        {dr("topDressesCode")}: {dress.code}
                      </Muted>
                    </div>
                    <div className="text-end text-sm">
                      <div>{fmtMoney(dress.revenue)}</div>
                      <Muted className="text-xs">
                        {dr("topDressesRentals")}: {dress.rentals}
                      </Muted>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Muted className="rounded-lg border border-dashed p-6 text-sm">
                {isPending
                  ? String(t("common.loading"))
                  : dr("topDressesEmpty")}
              </Muted>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-x-auto">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="size-4 text-muted-foreground" />
              <CardTitle className="text-base font-semibold">
                {dr("upcomingOccasionsTitle")}
              </CardTitle>
            </div>
            <CardDescription>
              {dr("upcomingOccasionsDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data?.upcomingOccasions && data.upcomingOccasions.length > 0 ? (
              <div className="overflow-hidden rounded-md border">
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="px-2">
                        {String(t("systemPages.reservationsCode"))}
                      </TableHead>
                      <TableHead className="px-2">
                        {String(t("systemPages.reservationsDress"))}
                      </TableHead>
                      <TableHead className="px-2">
                        {String(t("systemPages.reservationsCustomerName"))}
                      </TableHead>
                      <TableHead className="px-2">
                        {dr("occasionDate")}
                      </TableHead>
                      <TableHead className="px-2">
                        {String(t("systemPages.reservationsStatus"))}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.upcomingOccasions.map((occasion) => (
                      <TableRow key={occasion.id}>
                        <TableCell className="font-medium">
                          {occasion.reservationCode}
                        </TableCell>
                        <TableCell>{occasion.dressTitle}</TableCell>
                        <TableCell>{occasion.customerName}</TableCell>
                        <TableCell>
                          {formatDate(
                            occasion.occasionDate,
                            { month: "short", day: "numeric" },
                            locale,
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{occasion.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <Muted className="rounded-lg border border-dashed p-6 text-sm">
                {isPending
                  ? String(t("common.loading"))
                  : dr("upcomingOccasionsEmpty")}
              </Muted>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Expense breakdown + Payment method breakdown */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              {dr("expenseBreakdownTitle")}
            </CardTitle>
            <CardDescription>
              {dr("expenseBreakdownDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {rangeStats?.expensesByType &&
            rangeStats.expensesByType.length > 0 ? (
              <div className="space-y-2">
                {rangeStats.expensesByType.map((item) => (
                  <div
                    key={item.type}
                    className="flex items-center justify-between gap-2 rounded-lg border p-2.5 text-sm"
                  >
                    <Badge variant="outline">
                      {expenseTypeLabels[item.type] ?? item.type}
                    </Badge>
                    <span className="font-semibold">
                      {fmtMoney(item.amount)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <Muted className="rounded-lg border border-dashed p-6 text-sm">
                {isPending
                  ? String(t("common.loading"))
                  : dr("expenseBreakdownEmpty")}
              </Muted>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              {dr("paymentMethodTitle")}
            </CardTitle>
            <CardDescription>{dr("paymentMethodDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            {rangeStats?.paymentsByMethod &&
            rangeStats.paymentsByMethod.length > 0 ? (
              <div className="space-y-2">
                {rangeStats.paymentsByMethod.map((item) => (
                  <div
                    key={item.method}
                    className="flex items-center justify-between gap-2 rounded-lg border p-2.5 text-sm"
                  >
                    <Badge variant="outline">
                      {paymentMethodLabels[item.method] ?? item.method}
                    </Badge>
                    <span className="font-semibold">
                      {fmtMoney(item.amount)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <Muted className="rounded-lg border border-dashed p-6 text-sm">
                {isPending
                  ? String(t("common.loading"))
                  : dr("paymentMethodEmpty")}
              </Muted>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Returns due today + Top customers */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              {dr("dressReturnsTitle")}
            </CardTitle>
            <CardDescription>{dr("dressReturnsDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm font-medium">
              {dr("dressReturnsDueToday")}
            </div>
            {data?.dueTodayReservations &&
            data.dueTodayReservations.length > 0 ? (
              <div className="space-y-2">
                {data.dueTodayReservations.map((reservation) => (
                  <div
                    key={reservation.id}
                    className="flex items-center justify-between gap-2 rounded-lg border p-3 text-sm"
                  >
                    <div>
                      <div className="font-medium">
                        {reservation.reservationCode}
                      </div>
                      <Muted className="text-xs">
                        {reservation.customerName}
                      </Muted>
                    </div>
                    <DressViewDialog
                      dressId={reservation.dressId}
                      dressLabel={reservation.dressTitle}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <Muted className="rounded-lg border border-dashed p-6 text-sm">
                {isPending
                  ? String(t("common.loading"))
                  : dr("dressReturnsEmpty")}
              </Muted>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              {dr("recentCustomersTitle")}
            </CardTitle>
            <CardDescription>
              {dr("recentCustomersDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data?.recentCustomers && data.recentCustomers.length > 0 ? (
              <div className="space-y-2">
                {data.recentCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    className="flex items-center justify-between gap-2 rounded-lg border p-3 text-sm"
                  >
                    <div>
                      <div className="font-medium">{customer.name}</div>
                      <Muted className="text-xs">{customer.phone}</Muted>
                    </div>
                    <div className="text-end">
                      <div>
                        {numberFormatter.format(customer.reservationsCount)}{" "}
                        {String(t("systemPages.customersReservationsCount"))}
                      </div>
                      <Muted className="text-xs">
                        {customer.lastReservationAt
                          ? `${dr("lastReservation")}: ${formatDate(customer.lastReservationAt, {}, locale)}`
                          : dr("noReservations")}
                      </Muted>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Muted className="rounded-lg border border-dashed p-6 text-sm">
                {isPending
                  ? String(t("common.loading"))
                  : dr("recentCustomersEmpty")}
              </Muted>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick actions — at the bottom */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold">
            {dr("quickActionsTitle")}
          </CardTitle>
          <CardDescription>{dr("quickActionsDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-flow-row gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
            {isPending && quickActions.length === 0
              ? (["q1", "q2", "q3", "q4", "q5"] as const).map((k) => (
                  <div
                    key={k}
                    className="h-10 animate-pulse rounded-md border bg-muted"
                  />
                ))
              : quickActions.map((action) => (
                  <LinkButton
                    key={action.id}
                    href={action.href}
                    variant="outline"
                    className="flex h-auto min-h-10 flex-1 items-center justify-between gap-3 py-2"
                  >
                    <div className="flex items-center gap-3">
                      <action.icon className="size-4 text-primary" />
                      <span className="text-sm font-semibold leading-none">
                        {action.title}
                      </span>
                    </div>
                    <Badge variant="secondary">{action.badge}</Badge>
                  </LinkButton>
                ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
