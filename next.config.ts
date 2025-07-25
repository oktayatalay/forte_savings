import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export', // GitHub Actions deployment için geçici açıldı
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