import Image from "next/image";

import { ClientGreeting } from "@/app/_providers/client";
import { Button } from "@/components/ui/button";
import { AuthManager } from "@/features/core/auth/nextjs/components/auth-manager";
import { BranchManager } from "@/features/core/auth/nextjs/components/branch-manager";
import { UserAvatar } from "@/features/core/auth/nextjs/components/user-avatar";
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
        <AuthManager
          trigger={
            <Button
              variant={"ghost"}
              size={"icon-sm"}
              className={"hover:opacity-50"}
            >
              <UserAvatar />
            </Button>
          }
        />
        <BranchManager />
      </div>
    </main>
  );
}
