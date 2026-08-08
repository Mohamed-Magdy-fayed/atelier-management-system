import { DEFAULT_TABLE_SORTING } from "@/features/core/data-table/lib/default-sorting";
import { ReservationsTablePage } from "@/features/system/reservations/admin";
import { HydrateClient, prefetch, trpc } from "@/integrations/trpc/server";

const defaultReservationsInput = {
  page: 1,
  perPage: 20,
  sorting: [...DEFAULT_TABLE_SORTING],
  globalFilter: undefined as string | undefined,
};

export default async function ReservationsPage() {
  await prefetch(trpc.reservations.list.queryOptions(defaultReservationsInput));

  return (
    <HydrateClient>
      <div className="mx-auto max-w-6xl space-y-4 p-4 md:p-6">
        <ReservationsTablePage />
      </div>
    </HydrateClient>
  );
}
