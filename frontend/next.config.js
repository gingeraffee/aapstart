/** @type {import('next').NextConfig} */
const nextConfig = {
  // Proxy /api requests to the FastAPI backend during local development.
  // This avoids CORS issues and lets cookies work seamlessly on localhost.
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
