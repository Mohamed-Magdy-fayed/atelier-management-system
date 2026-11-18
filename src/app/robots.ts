import type { MetadataRoute } from "next";

import { env } from "@/env/server";

/**
 * Open to every crawler, AI ones included. Demo deployments (`DEMO_MODE=1`)
 * are private sales links and stay fully closed.
 */
export default function robots(): MetadataRoute.Robots {
  const base = env.BASE_URL.replace(/\/$/, "");
  if (env.DEMO_MODE === "1") {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
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
