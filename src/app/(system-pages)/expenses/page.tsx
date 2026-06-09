import { ExpensesTablePage } from "@/features/system/expenses/admin";
import { HydrateClient, prefetch, trpc } from "@/integrations/trpc/server";

const defaultExpensesInput = {
  page: 1,
  perPage: 20,
  sorting: [] as { id: string; desc: boolean }[],
  columnFilters: [] as { id: string; value: unknown }[],
  globalFilter: undefined as string | undefined,
};

export default async function ExpensesPage() {
  await prefetch(trpc.expenses.list.queryOptions(defaultExpensesInput));

  return (
    <HydrateClient>
      <div className="mx-auto max-w-6xl space-y-4 p-4 md:p-6">
        <ExpensesTablePage />
      </div>
    </HydrateClient>
  );
}
