import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { env } from "@/env/server";
import { Landing } from "./components/landing";
import { COPY, type MarketingLocale } from "./content";

/** See `MARKETING_SITE` in env/server.ts. */
export const marketingEnabled = () => env.MARKETING_SITE === "1";

const path = (l: MarketingLocale) => (l === "ar" ? "/" : "/en");

export function marketingMetadata(locale: MarketingLocale): Metadata {
  if (!marketingEnabled()) return {};
  const c = COPY[locale];
  const base = env.BASE_URL.replace(/\/$/, "");
  return {
    title: { absolute: c.meta.title },
    description: c.meta.description,
    alternates: {
      canonical: `${base}${path(locale)}`,
      languages: {
        ar: `${base}/`,
        en: `${base}/en`,
        "x-default": `${base}/`,
      },
    },
    openGraph: {
      title: c.meta.title,
      description: c.meta.description,
      locale: locale === "ar" ? "ar_EG" : "en",
      type: "website",
    },
    icons: { icon: "/brand/gateling-mark.png" },
    robots: { index: true, follow: true },
    verification: env.GOOGLE_SITE_VERIFICATION
      ? { google: env.GOOGLE_SITE_VERIFICATION }
      : undefined,
  };
}

export function MarketingPage({ locale }: { locale: MarketingLocale }) {
  if (!marketingEnabled()) notFound();
  return (
    <Landing
      locale={locale}
      siteUrl={env.BASE_URL.replace(/\/$/, "")}
      whatsappNumber={env.SALES_WHATSAPP_NUMBER}
    />
  );
}
