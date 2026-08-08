import { DEFAULT_TABLE_SORTING } from "@/features/core/data-table/lib/default-sorting";
import { RentalCustomersTablePage } from "@/features/system/rental-customers";
import { HydrateClient, prefetch, trpc } from "@/integrations/trpc/server";

const defaultRentalCustomersInput = {
  page: 1,
  perPage: 20,
  sorting: [...DEFAULT_TABLE_SORTING],
  columnFilters: [] as { id: string; value: unknown }[],
  globalFilter: undefined as string | undefined,
};

export default async function RentalCustomersPage() {
  await prefetch(
    trpc.rentalCustomers.list.queryOptions(defaultRentalCustomersInput),
  );

  return (
    <HydrateClient>
      <div className="mx-auto max-w-6xl space-y-4 p-4 md:p-6">
        <RentalCustomersTablePage />
      </div>
    </HydrateClient>
  );
}
