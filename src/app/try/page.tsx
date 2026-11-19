import type { Metadata } from "next";

import { getT } from "@/features/core/i18n/server";
import { TryExperience } from "@/features/sandbox/components/try-experience";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: String(t("sandbox.try.metaTitle")),
    robots: { index: false, follow: false },
  };
}

export default function TryPage() {
  return <TryExperience />;
}
