import type { MetadataRoute } from "next";

import { env } from "@/env/server";

/**
 * Marketing deployment: open to every crawler, AI ones included.
 * Any other deployment (a client's own storefront) is left as it was before
 * this file existed: no sitemap, nothing newly advertised, only `/api/` kept
 * out. Demo deployments (`DEMO_MODE=1`) are private sales links and stay closed.
 */
export default function robots(): MetadataRoute.Robots {
  if (env.DEMO_MODE === "1") {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  if (env.MARKETING_SITE !== "1") {
    return { rules: { userAgent: "*", allow: "/", disallow: "/api/" } };
  }
  const base = env.BASE_URL.replace(/\/$/, "");
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/dashboard", "/sign-in", "/my-account"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
