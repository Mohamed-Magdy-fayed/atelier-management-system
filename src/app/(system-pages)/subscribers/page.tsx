import { SubscribersTablePage } from "@/features/system/subscribers/admin";
import { HydrateClient } from "@/integrations/trpc/server";

export default function SubscribersPage() {
  return (
    <HydrateClient>
      <SubscribersTablePage />
    </HydrateClient>
  );
}
