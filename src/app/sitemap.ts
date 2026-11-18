import type { MetadataRoute } from "next";

import { env } from "@/env/server";
import { publishedRows } from "@/features/marketing/pseo";
import { rowPath } from "@/features/marketing/pseo/types";

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
    // Only rows a human has published. Drafts never appear here.
    ...publishedRows().map((r) => ({
      url: `${base}${rowPath(r)}`,
      lastModified: r.updatedAt,
    })),
  ];
}
