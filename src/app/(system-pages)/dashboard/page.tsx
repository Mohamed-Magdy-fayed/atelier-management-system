import { DashboardRentalPage } from "@/features/system/dashboard/admin/dashboard-rental-page";
import { HydrateClient, prefetch, trpc } from "@/integrations/trpc/server";

export default async function DashboardPage() {
  await prefetch(trpc.dashboard.getData.queryOptions());

  return (
    <HydrateClient>
      <DashboardRentalPage />
    </HydrateClient>
  );
}
