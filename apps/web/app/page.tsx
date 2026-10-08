"use client";

import React, { useState, useSyncExternalStore } from "react";
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
import { PWAInstallModal } from "./components/PWAInstallModal";

const subscribe = () => () => {};
const isLocal = () => ["localhost", "127.0.0.1"].includes(window.location.hostname);

export default function Home() {
  const local = useSyncExternalStore(subscribe, isLocal, () => false);
  const customerUrl = local ? "http://localhost:5173/explore/" : "/explore/";
  const merchantUrl = local ? "http://localhost:5174" : "https://merchant.gosavingfood.app";

  const [installTarget, setInstallTarget] = useState<"customer" | "merchant" | null>(null);

  const handleInstall = (target: "customer" | "merchant") => {
    if (typeof window !== "undefined") {
      const ua = navigator.userAgent || "";
      const isMobile =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

      // Ở trên máy tính: chuyển hướng trực tiếp tới giao diện web của app (không hiện popup QR)
      if (!isMobile) {
        const dest = target === "customer" ? customerUrl : merchantUrl;
        window.location.assign(dest);
        return;
      }
    }
    // Ở trên điện thoại: mở bảng hướng dẫn tải/cài đặt vào màn hình chính
    setInstallTarget(target);
  };

  return (
    <div className="landing-page relative min-h-screen-dynamic bg-[#f8faf7] text-[#0a2e1d] flex flex-col font-sans selection:bg-[#00a854] selection:text-white">
      <LandingMotion />
      {/* Navigation Bar */}
      <Navbar customerUrl={customerUrl} merchantUrl={merchantUrl} onInstall={handleInstall} />

      <main className="flex-1 w-full">
        {/* 1. Hero Section (The Awakening) - Scrub Video 1 via GSAP ScrollTrigger */}
        <HeroAwakening customerUrl={customerUrl} merchantUrl={merchantUrl} onInstall={handleInstall} />

        {/* 1.5 Story & Philosophy Bridge - Transition between Awakening and Harsh Reality */}
        <StoryBridge />

        {/* 2. The Shocking Reality - Scrub Video 2 via GSAP ScrollTrigger & Dynamic Counter */}
        <ShockingReality />

        {/* 3. Giải Pháp GoSavingFood - Interactive Dual-Audience Tab (Consumer vs Merchant) */}
        <SolutionGoSavingFood customerUrl={customerUrl} merchantUrl={merchantUrl} onInstall={handleInstall} />

        {/* 4. Lợi Ích & Tác Động - Interactive Impact & Savings Calculator */}
        <ImpactCalculator />

        {/* 5. Community / Testimonials & Store Partners Marquee */}
        <CommunityAndPartners />
      </main>

      <FoodMarquee />
      {/* 6. Footer */}
      <Footer customerUrl={customerUrl} merchantUrl={merchantUrl} onInstall={handleInstall} />

      {/* PWA Install Sheet/Modal */}
      <PWAInstallModal
        isOpen={installTarget !== null}
        target={installTarget || "customer"}
        onClose={() => setInstallTarget(null)}
        customerUrl={customerUrl}
        merchantUrl={merchantUrl}
      />
    </div>
  );
}


