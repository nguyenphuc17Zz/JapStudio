/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    return [
      {
        source: '/immersion/sources',
        destination: '/sources',
      },
      {
        source: '/immersion/sources/:path*',
        destination: '/sources/:path*',
      },
      {
        source: '/immersion/ingestion',
        destination: '/ingestion',
      },
      {
        source: '/immersion/ingestion/:path*',
        destination: '/ingestion/:path*',
      },
      {
        source: '/immersion/enrichment',
        destination: '/enrichment',
      },
      {
        source: '/immersion/enrichment/:path*',
        destination: '/enrichment/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
