import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "./landing.css";
import { ServiceWorkerRegister } from "./components/ServiceWorkerRegister";

const bodyFont = localFont({
  variable: "--font-body", display: "swap", preload: false,
  src: [
    { path: "./fonts/BeVietnamPro-Regular.ttf", weight: "400", style: "normal" },
    { path: "./fonts/BeVietnamPro-Medium.ttf", weight: "500", style: "normal" },
    { path: "./fonts/BeVietnamPro-SemiBold.ttf", weight: "600", style: "normal" },
    { path: "./fonts/BeVietnamPro-Bold.ttf", weight: "700", style: "normal" },
  ],
});
const display = localFont({ src: "./fonts/BeVietnamPro-Bold.ttf", variable: "--font-display", weight: "700", display: "swap" });
const marquee = localFont({ src: "./fonts/BarlowCondensed-Bold.ttf", variable: "--font-marquee", weight: "700", display: "swap", preload: false });

export const viewport: Viewport = {
  themeColor: "#1B4D3E",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "GoSavingFood - Giải Cứu Thực Phẩm, Tiết Kiệm Chi Phí | PWA",
  description: "Nền tảng kết nối giải cứu thực phẩm cận hạn và dư thừa trong ngày với giá giảm 50% - 80%. Ăn ngon, tiết kiệm và bảo vệ môi trường.",
  manifest: "/manifest.json",
  icons: {
    icon: "/media/logo-mark.svg",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className={`${bodyFont.variable} ${display.variable} ${marquee.variable} ${bodyFont.className} h-full scroll-smooth font-sans`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="GoSavingFood" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className={`${bodyFont.className} min-h-full flex flex-col bg-[#163e2e] text-[#0a2e1d] font-sans antialiased selection:bg-[#00a854] selection:text-white`}>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}





