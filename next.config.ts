import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    // No problematic experimental features
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        path: false,
      };
    }
    return config;
  },
};

export default nextConfig;
