import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/uploads/:filename',
        destination: '/api/uploads/:filename',
      },
    ];
  },
};

export default nextConfig;
