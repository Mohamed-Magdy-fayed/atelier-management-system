import type { ReactNode } from "react";

import { MarketingFontShell } from "@/features/marketing/font-shell";

export default function EnglishMarketingLayout({ children }: { children: ReactNode }) {
  return <MarketingFontShell>{children}</MarketingFontShell>;
}
