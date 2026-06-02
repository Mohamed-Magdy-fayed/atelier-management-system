import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.BASE_URL ?? "https://gateling.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard",
          "/work/",
          "/blog-posts",
          "/services-mgmt",
          "/testimonials",
          "/leads",
          "/subscribers",
          "/users",
          "/branches",
          "/settings",
          "/api/",
          "/my-account",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
