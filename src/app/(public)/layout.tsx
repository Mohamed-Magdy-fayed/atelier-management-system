import type { ReactNode } from "react";

import { PublicMobilePageTransition } from "@/features/public-catalog/components/public-mobile-page-transition";
import { PublicShell } from "@/features/public-catalog/components/public-shell";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <PublicShell>
      <PublicMobilePageTransition>{children}</PublicMobilePageTransition>
    </PublicShell>
  );
}
