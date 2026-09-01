import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/customer",
        destination: "http://127.0.0.1:5173",
      },
      {
        source: "/customer/:path*",
        destination: "http://127.0.0.1:5173/:path*",
      },
      {
        source: "/merchant",
        destination: "http://127.0.0.1:5174",
      },
      {
        source: "/merchant/:path*",
        destination: "http://127.0.0.1:5174/:path*",
      },
    ];
  },
};

export default nextConfig;
