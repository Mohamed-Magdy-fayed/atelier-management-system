import { notFound } from "next/navigation";

import {
  marketingEnabled,
  marketingMetadata,
} from "@/features/marketing/page-factory";
import { GlossStylePage } from "@/features/marketing/preview/gg-page";

export const metadata = marketingMetadata("ar");

/** `/` on the marketing deployment (see the rewrite in next.config.ts). */
export default function Page() {
  if (!marketingEnabled()) notFound();
  return <GlossStylePage />;
}
