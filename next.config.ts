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
  async rewrites() {
    return [
      {
        source: "/images/:path*",
        destination: "/uploads/images/:path*",
      },
    ];
  },
};

export default nextConfig;
