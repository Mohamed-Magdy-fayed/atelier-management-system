import { DEFAULT_TABLE_SORTING } from "@/features/core/data-table/lib/default-sorting";
import { PaymentsTablePage } from "@/features/system/payments";
import { HydrateClient, prefetch, trpc } from "@/integrations/trpc/server";

const defaultPaymentsInput = {
  page: 1,
  perPage: 20,
  sorting: [...DEFAULT_TABLE_SORTING],
  columnFilters: [] as { id: string; value: unknown }[],
  globalFilter: undefined as string | undefined,
};

export default async function PaymentsPage() {
  await prefetch(trpc.payments.list.queryOptions(defaultPaymentsInput));

  return (
    <HydrateClient>
      <div className="mx-auto max-w-6xl space-y-4 p-4 md:p-6">
        <PaymentsTablePage />
      </div>
    </HydrateClient>
  );
}
