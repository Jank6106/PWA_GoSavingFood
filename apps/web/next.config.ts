import type { NextConfig } from "next";
import path from "node:path";
import fs from "node:fs";

// Nạp file .env tập trung từ thư mục gốc Monorepo
const rootEnvPath = path.resolve(process.cwd(), process.cwd().endsWith("web") ? "../../.env" : ".env");
if (process.env.E2E_LOCAL !== 'true' && fs.existsSync(rootEnvPath)) {
  process.loadEnvFile(rootEnvPath);
}

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
      process.env.CUSTOMER_APP_URL?.trim() || "https://gsf-customer-pwa.vercel.app";
    const merchantTarget =
      process.env.MERCHANT_APP_URL?.trim() || "https://gsf-merchant-pwa.vercel.app";

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
        destination: isProd ? merchantTarget : process.env.E2E_LOCAL === 'true' ? "http://localhost:5174/merchant/" : "http://localhost:5174",
      },
      {
        source: "/merchant/:path*",
        destination: isProd
          ? `${merchantTarget}/:path*`
          : process.env.E2E_LOCAL === 'true' ? "http://localhost:5174/merchant/:path*" : "http://localhost:5174/:path*",
      },
    ];
  },
};

export default nextConfig;
