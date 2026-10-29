import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // packages/core ships TypeScript source.
  transpilePackages: ['@sant-vaani/core'],
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'i.ytimg.com' }],
  },
};

export default nextConfig;
