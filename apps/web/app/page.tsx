"use client";

import React, { useState, useEffect } from "react";
import { LandingMotion } from "./components/LandingMotion";
import { Navbar } from "./components/Navbar";
import { HeroAwakening } from "./components/HeroAwakening";
import { StoryBridge } from "./components/StoryBridge";
import { ShockingReality } from "./components/ShockingReality";
import { SolutionGoSavingFood } from "./components/SolutionGoSavingFood";
import { ImpactCalculator } from "./components/ImpactCalculator";
import { CommunityAndPartners } from "./components/CommunityAndPartners";
import { FoodMarquee } from "./components/FoodMarquee";
import { Footer } from "./components/Footer";

function getAppUrls() {
  if (typeof window === "undefined") {
    return {
      customerUrl: "/explore/",
      merchantUrl: "https://gsf-merchant-pwa.vercel.app",
    };
  }
  const host = window.location.hostname;
  const isLocal =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.startsWith("192.168.") ||
    host.startsWith("10.") ||
    host.endsWith(".local");

  return {
    customerUrl: isLocal ? "http://localhost:5173/explore/" : "/explore/",
    merchantUrl: isLocal ? "http://localhost:5174" : "https://gsf-merchant-pwa.vercel.app",
  };
}

export default function Home() {
  const [urls, setUrls] = useState({
    customerUrl: "/explore/",
    merchantUrl: "https://gsf-merchant-pwa.vercel.app",
  });

  useEffect(() => {
    const appUrls = getAppUrls();
    setUrls(appUrls);

    if (typeof window !== "undefined") {
      // 1. Khi mở ở chế độ Standalone PWA từ màn hình chính tại root '/', tự động chuyển tiếp ngay vào Customer App
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      if (isStandalone && window.location.pathname === "/") {
        window.location.replace(appUrls.customerUrl);
        return;
      }

      // 2. Nếu người dùng bị redirect về Landing Page kèm OAuth token/code, chuyển hướng ngay về Customer App
      const search = window.location.search;
      const hash = window.location.hash;
      const params = new URLSearchParams(search);
      if (params.has("code") || params.has("error") || hash.includes("access_token")) {
        const base = appUrls.customerUrl;
        const target = base.endsWith("/") ? base : `${base}/`;
        window.location.replace(`${target}${search}${hash}`);
      }
    }
  }, []);

  const handleInstall = (target: "customer" | "merchant") => {
    if (typeof window !== "undefined") {
      const currentUrls = getAppUrls();
      const dest = target === "customer" ? currentUrls.customerUrl : currentUrls.merchantUrl;
      window.location.assign(dest);
    }
  };

  return (
    <div className="landing-page relative min-h-screen-dynamic bg-[#f8faf7] text-[#0a2e1d] flex flex-col font-sans selection:bg-[#00a854] selection:text-white">
      <LandingMotion />
      {/* Navigation Bar */}
      <Navbar customerUrl={urls.customerUrl} merchantUrl={urls.merchantUrl} onInstall={handleInstall} />

      <main className="flex-1 w-full">
        {/* 1. Hero Section (The Awakening) */}
        <HeroAwakening customerUrl={urls.customerUrl} merchantUrl={urls.merchantUrl} onInstall={handleInstall} />

        {/* 1.5 Story & Philosophy Bridge */}
        <StoryBridge />

        {/* 2. The Shocking Reality */}
        <ShockingReality />

        {/* 3. Giải Pháp GoSavingFood */}
        <SolutionGoSavingFood customerUrl={urls.customerUrl} merchantUrl={urls.merchantUrl} onInstall={handleInstall} />

        {/* 4. Lợi Ích & Tác Động */}
        <ImpactCalculator />

        {/* 5. Community / Testimonials & Store Partners */}
        <CommunityAndPartners />
      </main>

      <FoodMarquee />
      {/* 6. Footer */}
      <Footer customerUrl={urls.customerUrl} merchantUrl={urls.merchantUrl} onInstall={handleInstall} />
    </div>
  );
}


