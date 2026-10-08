import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  async redirects() {
    return [
      // 1. Chuyển hướng www.gosavingfood.app -> gosavingfood.app (Apex)
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "www.gosavingfood.app",
          },
        ],
        destination: "https://gosavingfood.app/:path*",
        permanent: true,
      },
      // 2. Chuyển hướng đường dẫn cũ /customer -> /explore
      {
        source: "/customer",
        destination: "/explore",
        permanent: true,
      },
      {
        source: "/customer/:path*",
        destination: "/explore/:path*",
        permanent: true,
      },
    ];
  },

  async rewrites() {
    const isProd = process.env.NODE_ENV === "production";
    const customerTarget =
      process.env.CUSTOMER_APP_URL || "https://gsf-customer-pwa.vercel.app";
    const merchantTarget =
      process.env.MERCHANT_APP_URL || "https://gsf-merchant-pwa.vercel.app";

    return [
      // /explore -> Customer PWA
      {
        source: "/explore",
        destination: isProd
          ? `${customerTarget}/explore/`
          : "http://localhost:5173/explore/",
      },
      {
        source: "/explore/:path*",
        destination: isProd
          ? `${customerTarget}/explore/:path*`
          : "http://localhost:5173/explore/:path*",
      },
      // Fallback dev proxy cho merchant
      {
        source: "/merchant",
        destination: isProd ? merchantTarget : "http://localhost:5174",
      },
      {
        source: "/merchant/:path*",
        destination: isProd
          ? `${merchantTarget}/:path*`
          : "http://localhost:5174/:path*",
      },
    ];
  },
};

export default nextConfig;
