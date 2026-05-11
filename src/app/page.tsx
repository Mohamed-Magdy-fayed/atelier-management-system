import Image from "next/image";

import { ClientGreeting, HomeUserActions } from "@/app/_providers/client";
import { HydrateClient } from "@/integrations/trpc/server";

export default async function Home() {
  return (
    <main className="flex flex-1 w-full min-h-screen max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
      <Image
        src="/megz-logo.svg"
        alt="Megz logo"
        width={100}
        height={100}
        priority
      />
      <HydrateClient>
        <ClientGreeting />
      </HydrateClient>
      <div className="flex items-center gap-2">
        <HomeUserActions />
      </div>
    </main>
  );
}
