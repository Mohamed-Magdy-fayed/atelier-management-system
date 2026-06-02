"use client";

import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  Briefcase,
  FileText,
  Mail,
  MessageSquare,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
import { useTranslation } from "@/features/core/i18n/client";
import { useTRPC } from "@/integrations/trpc/client";

const LEAD_STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  new: "default",
  contacted: "secondary",
  qualified: "outline",
  closed: "secondary",
};

export function DashboardRentalPage() {
  const { t } = useTranslation();
  const trpc = useTRPC();

  const { data, isLoading } = useQuery(trpc.dashboard.getData.queryOptions());

  const summary = data?.summary;
  const recentLeads = data?.recentLeads ?? [];

  const kpis = [
    {
      label: t("dashboard.newLeadsThisMonth"),
      value: summary?.newLeadsThisMonth ?? "—",
      icon: MessageSquare,
      description: t("dashboard.newLeadsThisMonthDesc"),
    },
    {
      label: t("dashboard.activeSubscribers"),
      value: summary?.activeSubscribers ?? "—",
      icon: Mail,
      description: t("dashboard.activeSubscribersDesc"),
    },
    {
      label: t("dashboard.publishedCaseStudies"),
      value: summary?.publishedCaseStudies ?? "—",
      icon: Briefcase,
      description: t("dashboard.publishedCaseStudiesDesc"),
    },
    {
      label: t("dashboard.publishedBlogPosts"),
      value: summary?.publishedBlogPosts ?? "—",
      icon: FileText,
      description: t("dashboard.publishedBlogPostsDesc"),
    },
    {
      label: t("dashboard.activeServices"),
      value: summary?.activeServices ?? "—",
      icon: BookOpen,
      description: t("dashboard.activeServicesDesc"),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <div>
        <H2>{t("dashboard.title")}</H2>
        <Muted>{t("dashboard.lead")}</Muted>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{kpi.label}</CardTitle>
              <kpi.icon className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? "—" : kpi.value}
              </div>
              <p className="text-muted-foreground text-xs">{kpi.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Leads */}
      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.recentLeads")}</CardTitle>
          <CardDescription>{t("dashboard.recentLeadsDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Muted>{t("common.loading")}</Muted>
          ) : recentLeads.length === 0 ? (
            <Muted>{t("dashboard.noLeads")}</Muted>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("leads.name")}</TableHead>
                  <TableHead>{t("leads.email")}</TableHead>
                  <TableHead>{t("leads.company")}</TableHead>
                  <TableHead>{t("leads.status")}</TableHead>
                  <TableHead>{t("leads.createdAt")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentLeads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium">{lead.name}</TableCell>
                    <TableCell>{lead.email}</TableCell>
                    <TableCell>{lead.company ?? "—"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          LEAD_STATUS_VARIANT[lead.status] ?? "secondary"
                        }
                      >
                        {String(
                          {
                            new: t("leads.statusValues.new"),
                            contacted: t("leads.statusValues.contacted"),
                            qualified: t("leads.statusValues.qualified"),
                            closed: t("leads.statusValues.closed"),
                          }[lead.status] ?? lead.status,
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(lead.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
