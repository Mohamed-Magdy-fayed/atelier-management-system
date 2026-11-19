import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { env } from "@/env/server";
import { marketingEnabled } from "@/features/marketing/page-factory";
import { getRow, visibleRows } from "@/features/marketing/pseo";
import { PseoPage } from "@/features/marketing/pseo/pseo-page";
import {
  FAMILY_META,
  isEnglishFamily,
  type PseoFamily,
  rowPath,
} from "@/features/marketing/pseo/types";

const FAMILIES: PseoFamily[] = (Object.keys(FAMILY_META) as PseoFamily[]).filter(
  (f) => !isEnglishFamily(f),
);

export function generateStaticParams() {
  const params = visibleRows().map((r) => ({ family: r.family, slug: r.slug }));
  // Cache Components needs at least one param; the page 404s for the placeholder.
  return params.length > 0 ? params : [{ family: "hulul", slug: "__none" }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ family: string; slug: string }>;
}): Promise<Metadata> {
  const { family, slug } = await params;
  const row = FAMILIES.includes(family as PseoFamily)
    ? getRow(family as PseoFamily, slug)
    : undefined;
  if (!row || !marketingEnabled()) return {};
  const base = env.BASE_URL.replace(/\/$/, "");
  return {
    title: { absolute: row.title },
    description: row.description,
    alternates: { canonical: `${base}${rowPath(row)}` },
    openGraph: {
      title: row.title,
      description: row.description,
      locale: "ar_EG",
      type: "article",
    },
    robots: row.published
      ? { index: true, follow: true }
      : { index: false, follow: false },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ family: string; slug: string }>;
}) {
  const { family, slug } = await params;
  const row = FAMILIES.includes(family as PseoFamily)
    ? getRow(family as PseoFamily, slug)
    : undefined;
  if (!row || !marketingEnabled()) notFound();
  return <PseoPage row={row} />;
}
