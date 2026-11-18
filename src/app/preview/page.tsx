import type { Metadata } from "next";

import { GlossStylePage } from "@/features/marketing/preview/gg-page";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function PreviewPage() {
  return <GlossStylePage />;
}
