import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { marketingEnabled } from "@/features/marketing/page-factory";
import { visibleRows } from "@/features/marketing/pseo";
import { PseoHub } from "@/features/marketing/pseo/pseo-page";
import {
  FAMILY_META,
  isEnglishFamily,
  type PseoFamily,
} from "@/features/marketing/pseo/types";

const FAMILIES: PseoFamily[] = (Object.keys(FAMILY_META) as PseoFamily[]).filter(
  (f) => !isEnglishFamily(f),
);

export function generateStaticParams() {
  return FAMILIES.map((family) => ({ family }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ family: string }>;
}): Promise<Metadata> {
  const { family } = await params;
  const meta = FAMILY_META[family as PseoFamily];
  if (!meta || !marketingEnabled()) return {};
  const hasPublished = visibleRows(family as PseoFamily).some(
    (r) => r.published,
  );
  return {
    title: { absolute: `${meta.hubTitle} | Gateling Atelier` },
    description: meta.hubLead,
    robots: hasPublished
      ? { index: true, follow: true }
      : { index: false, follow: false },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ family: string }>;
}) {
  const { family } = await params;
  if (!marketingEnabled() || !FAMILIES.includes(family as PseoFamily))
    notFound();
  // A hub with nothing visible must not exist in production.
  if (visibleRows(family as PseoFamily).length === 0) notFound();
  return <PseoHub family={family as PseoFamily} />;
}
