import type { Metadata } from "next";
import type { ReactNode } from "react";

import { SandboxProviders } from "@/features/sandbox/components/sandbox-providers";
import { SandboxShell } from "@/features/sandbox/components/sandbox-shell";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * The real system screens running on browser-only data. Reached through the
 * proxy rewrite for visitors holding the sandbox cookie (see `src/proxy.ts`),
 * so links inside the app keep their normal paths (`/dresses`, `/branches`).
 */
export default function SandboxAppLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <SandboxProviders>
      <SandboxShell>{children}</SandboxShell>
    </SandboxProviders>
  );
}
