import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { GlossStylePage } from "@/features/marketing/preview/gg-page";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function PreviewPage() {
  // Dev-only: in production `/` serves this design on the marketing deployment.
  if (process.env.NODE_ENV === "production") notFound();
  return <GlossStylePage preview />;
}
