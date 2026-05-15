"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CalendarCheck2,
  CalendarPlus,
  ChartSpline,
  CreditCard,
  PiggyBank,
  Receipt,
  Shirt,
  UserPlus2,
  Users2,
  Wallet,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
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

const defaultRange: DateRange = {
  from: startOfDay(subDays(new Date(), 29)),
  to: endOfDay(new Date()),
};

function formatPercentage(value: number) {
  return `${value > 0 ? "+" : value < 0 ? "-" : ""}${Math.abs(value).toFixed(1)}%`;
}

export function DashboardRentalPage() {
  const { t, locale } = useTranslation();
  const trpc = useTRPC();
  const branchId = useActiveBranchId();
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
        label: dr("rangeLast3Months"),
        getRange: () => ({
          from: startOfDay(subDays(now, 89)),
          to: endOfDay(now),
        }),
      },
    ];
  }, [t]);

  const [draftRange, setDraftRange] = useState<DateRange>(defaultRange);

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

  const summaryCards = summary
    ? [
        {
          id: "total-revenue",
          title: dr("summaryTotalRevenue"),
          value: fmtMoney(summary.totalRevenue),
          icon: PiggyBank,
          supporting: dr("summaryTotalReservations", {
            count: summary.totalReservations,
          }),
        },
        {
          id: "monthly-revenue",
          title: dr("summaryRevenueThisMonth"),
          value: fmtMoney(summary.monthlyRevenue),
          icon: Wallet,
          change: summary.monthlyRevenueChange,
        },
        {
          id: "weekly-reservations",
          title: dr("summaryReservationsThisWeek"),
          value: numberFormatter.format(summary.reservationsThisWeek),
          icon: ChartSpline,
          badge: `${dr("summaryReservationsToday")}: ${summary.reservationsToday}`,
        },
        {
          id: "active-reservations",
          title: dr("summaryActiveReservations"),
          value: numberFormatter.format(summary.activeReservations),
          icon: CalendarCheck2,
          badge: dr("summaryUpcomingPickups", {
            count: summary.upcomingPickups,
          }),
        },
        {
          id: "customers",
          title: dr("summaryCustomers"),
          value: numberFormatter.format(summary.customerCount),
          icon: Users2,
          badge: dr("summaryActiveCustomers", {
            count: summary.activeCustomers,
          }),
        },
        {
          id: "outstanding",
          title: dr("summaryUpcomingBalanceDue"),
          value: fmtMoney(summary.upcomingBalanceDue),
          icon: AlertTriangle,
          badge: dr("summaryOverdueReturns", {
            count: summary.overdueReturns,
          }),
          highlight: summary.upcomingBalanceDue > 0,
          destructiveBadge: summary.overdueReturns > 0,
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
      <div className="space-y-1">
        <H2>{String(t("systemPages.dashboardTitle"))}</H2>
        <Muted>{String(t("systemPages.dashboardLead"))}</Muted>
      </div>

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
              ? Array.from({ length: 5 }).map((_, idx) => (
                  <div
                    key={idx}
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

      <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
        {isPending && summaryCards.length === 0
          ? Array.from({ length: 6 }).map((_, idx) => (
              <Card key={idx} className="animate-pulse">
                <CardHeader className="pb-2">
                  <div className="h-3 w-24 rounded bg-muted" />
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="h-6 w-28 rounded bg-muted" />
                </CardContent>
              </Card>
            ))
          : summaryCards.map((card) => (
              <Card
                key={card.id}
                className={cn(
                  "relative overflow-hidden transition hover:shadow-md",
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
                <CardContent className="space-y-3">
                  <div className="text-2xl font-semibold tracking-tight">
                    {card.value}
                  </div>
                  {card.change != null && (
                    <div className="flex items-center gap-1 text-xs font-medium">
                      {card.change > 0 && (
                        <ArrowUpRight className="size-3 text-emerald-500" />
                      )}
                      {card.change < 0 && (
                        <ArrowDownRight className="size-3 text-destructive" />
                      )}
                      <span
                        className={cn(
                          card.change > 0
                            ? "text-emerald-600"
                            : card.change < 0
                              ? "text-destructive"
                              : "text-muted-foreground",
                        )}
                      >
                        {formatPercentage(card.change)}
                      </span>
                    </div>
                  )}
                  {card.supporting && (
                    <CardDescription>{card.supporting}</CardDescription>
                  )}
                  {card.badge && (
                    <Badge
                      variant={
                        card.destructiveBadge ? "destructive" : "secondary"
                      }
                    >
                      {card.badge}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="h-full lg:col-span-2">
          <CardHeader className="flex flex-col gap-4 border-b py-5 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
            <div className="space-y-1">
              <CardTitle className="text-base font-semibold">
                {dr("rangeTitle")}
              </CardTitle>
              <CardDescription>{dr("rangeDescription")}</CardDescription>
            </div>
            <SelectDateField
              className="w-min shrink-0"
              mode="range"
              numberOfMonths={1}
              rangePresets={rangePresets}
              title={dr("rangeDateRange")}
              value={draftRange}
              setValue={(value) => {
                if (!value || Array.isArray(value) || value instanceof Date) {
                  return;
                }
                setDraftRange(value);
                syncSearchParams(value);
              }}
            />
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border bg-muted/40 p-4">
                <Receipt className="mb-2 size-4 text-muted-foreground" />
                <div className="text-sm text-muted-foreground">
                  {dr("rangeRevenue")}
                </div>
                <div className="text-2xl font-semibold">
                  {rangeStats
                    ? fmtMoney(rangeStats.totalRevenue)
                    : isPending
                      ? "—"
                      : fmtMoney(0)}
                </div>
              </div>
              <div className="rounded-xl border bg-muted/40 p-4">
                <CalendarCheck2 className="mb-2 size-4 text-muted-foreground" />
                <div className="text-sm text-muted-foreground">
                  {dr("rangeReservations")}
                </div>
                <div className="text-2xl font-semibold">
                  {rangeStats
                    ? numberFormatter.format(rangeStats.reservationsCount)
                    : "—"}
                </div>
              </div>
              <div className="rounded-xl border bg-muted/40 p-4">
                <Users2 className="mb-2 size-4 text-muted-foreground" />
                <div className="text-sm text-muted-foreground">
                  {dr("rangeNewCustomers")}
                </div>
                <div className="text-2xl font-semibold">
                  {rangeStats
                    ? numberFormatter.format(rangeStats.newCustomers)
                    : "—"}
                </div>
                <Muted className="mt-2 block text-xs">
                  {rangeStats?.averageReservationValue != null
                    ? dr("rangeAvgReservation", {
                        value: fmtMoney(rangeStats.averageReservationValue),
                      })
                    : dr("rangeNotEnoughData")}
                </Muted>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              {dr("topDressesTitle")}
            </CardTitle>
            <CardDescription>{dr("topDressesDescription")}</CardDescription>
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
                      <div className="font-medium text-sm">{dress.title}</div>
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
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="h-full overflow-x-auto">
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

        <Card className="h-full overflow-x-auto">
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
                <Badge variant="secondary">
                  {dr("outstandingTotal")}: {fmtMoney(data.totalOutstanding)}
                </Badge>
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

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              {dr("dressReturnsTitle")}
            </CardTitle>
            <CardDescription>{dr("dressReturnsDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Badge variant="secondary">
                {dr("dressReturnsOutNow")}: {data?.dressesOutCount ?? 0}
              </Badge>
            </div>
            <div className="font-medium text-sm">
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
    </div>
  );
}
