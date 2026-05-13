import { LinkButton } from "@/components/general/link-button";
import { H2, Lead } from "@/components/ui/typography";
import { getT } from "@/features/core/i18n/server";

export default async function DashboardPage() {
  const { t } = await getT();

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      <div className="space-y-1">
        <H2>{String(t("systemPages.dashboardTitle"))}</H2>
        <Lead>{String(t("systemPages.dashboardLead"))}</Lead>
      </div>
      <div className="flex flex-wrap gap-2">
        <LinkButton href="/employees" variant="outline" size="sm">
          {String(t("systemPages.navEmployees"))}
        </LinkButton>
        <LinkButton href="/customers" variant="outline" size="sm">
          {String(t("systemPages.navCustomers"))}
        </LinkButton>
      </div>
    </div>
  );
}
