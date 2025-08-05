import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Note: 'output: export' disabled to enable API routes
  // For static deployment, you'll need a different deployment strategy
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
  },
  // Environment variables for runtime
  env: {
    DB_HOST: process.env.DB_HOST,
    DB_USER: process.env.DB_USER,
    DB_PASS: process.env.DB_PASS,
    DB_NAME: process.env.DB_NAME,
  }
};

export default nextConfig;