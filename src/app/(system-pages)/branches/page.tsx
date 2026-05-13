import { BranchesTablePage } from "@/features/system/branches/admin";
import { HydrateClient, prefetch, trpc } from "@/integrations/trpc/server";

const defaultBranchesInput = {
  page: 1,
  perPage: 20,
  sorting: [] as { id: string; desc: boolean }[],
  globalFilter: undefined as string | undefined,
};

export default async function BranchesPage() {
  await prefetch(trpc.branches.list.queryOptions(defaultBranchesInput));

  return (
    <HydrateClient>
      <div className="mx-auto max-w-6xl space-y-4 p-4 md:p-6">
        <BranchesTablePage />
      </div>
    </HydrateClient>
  );
}
