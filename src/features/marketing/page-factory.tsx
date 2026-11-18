import type { Metadata } from "next";

import { env } from "@/env/server";
import { Landing } from "./components/landing";
import { COPY, type MarketingLocale } from "./content";

const path = (l: MarketingLocale) => (l === "ar" ? "/start" : "/start/en");

export function marketingMetadata(locale: MarketingLocale): Metadata {
  const c = COPY[locale];
  const base = env.BASE_URL.replace(/\/$/, "");
  return {
    title: { absolute: c.meta.title },
    description: c.meta.description,
    alternates: {
      canonical: `${base}${path(locale)}`,
      languages: {
        ar: `${base}/start`,
        en: `${base}/start/en`,
        "x-default": `${base}/start`,
      },
    },
    openGraph: {
      title: c.meta.title,
      description: c.meta.description,
      locale: locale === "ar" ? "ar_EG" : "en",
      type: "website",
    },
    robots: { index: true, follow: true },
    verification: env.GOOGLE_SITE_VERIFICATION
      ? { google: env.GOOGLE_SITE_VERIFICATION }
      : undefined,
  };
}

export function MarketingPage({ locale }: { locale: MarketingLocale }) {
  return (
    <Landing
      locale={locale}
      siteUrl={env.BASE_URL.replace(/\/$/, "")}
      whatsappNumber={env.SALES_WHATSAPP_NUMBER}
    />
  );
}
