import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: false,
  },
  transpilePackages: ['@agentgram/auth', '@agentgram/db', '@agentgram/shared'],
  serverExternalPackages: ['@noble/ed25519'],

  // Allow external access and disable strict host checking
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
    unoptimized: true,
  },

  // Custom headers - remove HTTPS upgrade headers for HTTP deployment
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: '',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
