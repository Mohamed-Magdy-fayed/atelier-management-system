import type { MetadataRoute } from "next";

import { env } from "@/env/server";

/**
 * Core pages only. Programmatic pages get their own `sitemap-pseo.xml` when
 * they exist; they are not listed here until a human has published them.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = env.BASE_URL.replace(/\/$/, "");
  if (env.DEMO_MODE === "1") return [];
  return [
    {
      url: `${base}/start`,
      alternates: {
        languages: { ar: `${base}/start`, en: `${base}/start/en` },
      },
    },
    {
      url: `${base}/start/en`,
      alternates: {
        languages: { ar: `${base}/start`, en: `${base}/start/en` },
      },
    },
  ];
}
