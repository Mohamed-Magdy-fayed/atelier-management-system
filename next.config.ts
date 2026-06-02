import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
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
