import { ProductsTablePage } from "@/features/system/products/admin";
import { HydrateClient, prefetch, trpc } from "@/integrations/trpc/server";

const defaultProductsInput = {
  page: 1,
  perPage: 20,
  sorting: [] as { id: string; desc: boolean }[],
  globalFilter: undefined as string | undefined,
};

export default async function ProductsPage() {
  await prefetch(trpc.products.list.queryOptions(defaultProductsInput));

  return (
    <HydrateClient>
      <div className="mx-auto max-w-6xl space-y-4 p-4 md:p-6">
        <ProductsTablePage />
      </div>
    </HydrateClient>
  );
}
