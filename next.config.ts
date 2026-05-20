import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'hometools-center.com' },
      { protocol: 'https', hostname: 'jwyvdngiccmjhcwlmyql.supabase.co' },
    ],
  },
  typedRoutes: false,  // re-enable when all routes exist
  turbopack: {
    root: __dirname,
  },
};

export default config;
