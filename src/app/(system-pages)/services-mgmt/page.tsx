import { ServicesTablePage } from "@/features/system/services-mgmt/admin";
import { HydrateClient } from "@/integrations/trpc/server";

export default function ServicesMgmtPage() {
  return (
    <HydrateClient>
      <ServicesTablePage />
    </HydrateClient>
  );
}
