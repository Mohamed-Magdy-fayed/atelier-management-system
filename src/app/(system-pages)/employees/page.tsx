import { EmployeesTablePage } from "@/features/system/users/admin";
import { HydrateClient } from "@/integrations/trpc/server";

export default async function EmployeesPage() {
  return (
    <HydrateClient>
      <div className="mx-auto max-w-6xl space-y-4 p-4 md:p-6">
        <EmployeesTablePage />
      </div>
    </HydrateClient>
  );
}
