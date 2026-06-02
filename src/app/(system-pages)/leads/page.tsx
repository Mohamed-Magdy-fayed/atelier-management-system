import { LeadsTablePage } from "@/features/system/leads/admin";
import { HydrateClient } from "@/integrations/trpc/server";

export default function LeadsPage() {
  return (
    <HydrateClient>
      <LeadsTablePage />
    </HydrateClient>
  );
}
