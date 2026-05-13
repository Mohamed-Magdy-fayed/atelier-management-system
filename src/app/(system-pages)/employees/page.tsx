import { EmployeesTablePage } from "./employees-table-page";
import { HydrateClient, prefetch, trpc } from "@/integrations/trpc/server";

export default async function EmployeesPage() {
  await prefetch(trpc.users.listEmployees.queryOptions());

  return (
    <HydrateClient>
      <div className="mx-auto max-w-6xl space-y-4 p-4 md:p-6">
        <EmployeesTablePage />
      </div>
    </HydrateClient>
  );
}
