import { CaseStudiesTablePage } from "@/features/system/case-studies/admin";
import { HydrateClient } from "@/integrations/trpc/server";

export default function WorkPage() {
  return (
    <HydrateClient>
      <CaseStudiesTablePage />
    </HydrateClient>
  );
}
