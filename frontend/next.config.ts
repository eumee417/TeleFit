import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://15.164.236.11:3000/api/:path*",
      },
    ];
  },
};

export default nextConfig;
