import { SettingsTablePage } from "@/features/system/settings";
import { HydrateClient, prefetch, trpc } from "@/integrations/trpc/server";

const defaultSettingsInput = {
  page: 1,
  perPage: 20,
  sorting: [] as { id: string; desc: boolean }[],
  globalFilter: undefined as string | undefined,
};

export default async function SettingsPage() {
  await prefetch(trpc.settings.list.queryOptions(defaultSettingsInput));

  return (
    <HydrateClient>
      <div className="mx-auto max-w-6xl space-y-4 p-4 md:p-6">
        <SettingsTablePage />
      </div>
    </HydrateClient>
  );
}
