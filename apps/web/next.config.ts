import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:3001/:path*",
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/policy",
        destination: "/privacy",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;