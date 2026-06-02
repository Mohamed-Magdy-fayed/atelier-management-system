import { DressesTablePage } from "@/features/system/dresses/admin";
import { HydrateClient, prefetch, trpc } from "@/integrations/trpc/server";

const defaultDressesInput = {
  page: 1,
  perPage: 20,
  sorting: [] as { id: string; desc: boolean }[],
  globalFilter: undefined as string | undefined,
};

export default async function DressesPage() {
  await prefetch(trpc.dresses.list.queryOptions(defaultDressesInput));

  return (
    <HydrateClient>
      <div className="mx-auto max-w-6xl space-y-4 p-4 md:p-6">
        <DressesTablePage />
      </div>
    </HydrateClient>
  );
}
