import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: 'export', // Dynamic routes için kapatıldı
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
  images: {
    unoptimized: true
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    typedRoutes: false,
  }
};

export default nextConfig;