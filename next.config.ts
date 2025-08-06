import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export', // GitHub Actions deployment için static export
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
  
  // Image optimization disabled for static export
  images: {
    unoptimized: true
  },
  
  // Disable ESLint during builds for faster deployment
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // TypeScript config
  typescript: {
    ignoreBuildErrors: false, // Keep TypeScript checking enabled
  },
  
  // Experimental features
  experimental: {
    typedRoutes: false, // Disable typed routes for static export compatibility
  },
  
  // Optimize for static export
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn']
    } : false,
  },
  
  
  // Configure for static hosting
  assetPrefix: process.env.NODE_ENV === 'production' ? '' : '',
  basePath: '',
  
  // Note: Headers don't work with static export, handle via hosting provider
  
  // Webpack configuration for better static export
  webpack: (config, { dev, isServer }) => {
    // Optimize for static export
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks.cacheGroups,
          // Create a separate chunk for auth pages to reduce initial bundle size
          auth: {
            name: 'auth',
            chunks: 'all',
            test: /[\/]auth[\/]/,
            priority: 20,
          },
          // Create a separate chunk for UI components
          ui: {
            name: 'ui',
            chunks: 'all',
            test: /[\/]components[\/]ui[\/]/,
            priority: 15,
          },
        },
      };
    }
    
    return config;
  },
};

export default nextConfig;