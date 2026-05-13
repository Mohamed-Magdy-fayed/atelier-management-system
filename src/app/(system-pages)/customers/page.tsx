import { CustomersTablePage } from "@/features/system/users/admin";
import { HydrateClient, prefetch, trpc } from "@/integrations/trpc/server";

const defaultCustomersInput = {
  page: 1,
  perPage: 20,
  sorting: [] as { id: string; desc: boolean }[],
  columnFilters: [] as { id: string; value: unknown }[],
  globalFilter: undefined as string | undefined,
};

export default async function CustomersPage() {
  await prefetch(trpc.users.listCustomers.queryOptions(defaultCustomersInput));

  return (
    <HydrateClient>
      <div className="mx-auto max-w-6xl space-y-4 p-4 md:p-6">
        <CustomersTablePage />
      </div>
    </HydrateClient>
  );
}
