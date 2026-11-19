import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { env } from "@/env/server";
import { marketingEnabled } from "@/features/marketing/page-factory";
import { getRow, visibleRows } from "@/features/marketing/pseo";
import { PseoPage } from "@/features/marketing/pseo/pseo-page";
import { rowPath } from "@/features/marketing/pseo/types";

export function generateStaticParams() {
  const params = visibleRows("software").map((r) => ({ slug: r.slug }));
  // Cache Components needs at least one param; the page 404s for the placeholder.
  return params.length > 0 ? params : [{ slug: "__none" }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const row = getRow("software", slug);
  if (!row || !marketingEnabled()) return {};
  const base = env.BASE_URL.replace(/\/$/, "");
  return {
    title: { absolute: row.title },
    description: row.description,
    alternates: { canonical: `${base}${rowPath(row)}` },
    openGraph: {
      title: row.title,
      description: row.description,
      locale: "en_US",
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
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const row = getRow("software", slug);
  if (!row || !marketingEnabled()) notFound();
  return <PseoPage row={row} />;
}
