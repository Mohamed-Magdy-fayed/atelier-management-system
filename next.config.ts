import type { NextConfig } from "next";

/**
 * Uploads land on Firebase Storage via `file.publicUrl()`, which is always
 * `https://storage.googleapis.com/<bucket>/...`.
 *
 * The path is scoped to this deployment's own bucket rather than left open:
 * every client runs a separate deployment with a separate bucket, and an
 * unscoped entry would let any of them be used to optimise images out of
 * another's storage.
 */
const firebaseBucket = process.env.FIREBASE_STORAGE_BUCKET;

/**
 * Same switch as `MARKETING_SITE` in env/server.ts, read here because routing
 * is decided at build time. Only the Gateling deployment sets it; client
 * storefronts keep their own `/`.
 */
const marketingSite = process.env.MARKETING_SITE === "1";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
        pathname: firebaseBucket ? `/${firebaseBucket}/**` : "/**",
      },
    ],
  },
  async redirects() {
    // The marketing pages are built at /start so they can be reviewed without
    // touching a storefront's home page. On the Gateling deployment they are
    // served from the root instead, and the old URLs fold into it.
    if (!marketingSite) return [];
    return [
      { source: "/start", destination: "/", permanent: true },
      { source: "/start/en", destination: "/en", permanent: true },
    ];
  },
  async rewrites() {
    const images = {
      source: "/images/:path*",
      destination: "/uploads/images/:path*",
    };
    if (!marketingSite) return [images];
    return {
      // beforeFiles so these win over the storefront's own `/` page.
      beforeFiles: [
        { source: "/", destination: "/start" },
        { source: "/en", destination: "/start/en" },
      ],
      afterFiles: [images],
      fallback: [],
    };
  },
};

export default nextConfig;
