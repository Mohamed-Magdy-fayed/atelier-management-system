import Image from "next/image";

import { ClientGreeting } from "@/app/_providers/client";
import { ThemeToggle } from "@/features/core/color-theme/client";
import { LanguageToggle } from "@/features/core/i18n/client";
import { HydrateClient } from "@/integrations/trpc/server";

export default function Home() {
  return (
    <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
      <Image
        className="dark:invert"
        src="/next.svg"
        alt="Next.js logo"
        width={100}
        height={20}
        priority
      />
      <ThemeToggle />
      <LanguageToggle />
      <HydrateClient>
        <ClientGreeting />
      </HydrateClient>
    </main>
  );
}
