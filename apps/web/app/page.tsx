"use client";

import React, { useSyncExternalStore } from "react";
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


const subscribe = () => () => {};
const isLocal = () => ["localhost", "127.0.0.1"].includes(window.location.hostname);

export default function Home() {
  const local = useSyncExternalStore(subscribe, isLocal, () => false);
  const customerUrl = "/explore";
  const merchantUrl = local ? "http://localhost:5174" : "https://merchant.gosavingfood.app";

  return (
    <div className="landing-page relative min-h-screen-dynamic bg-[#f8faf7] text-[#0a2e1d] flex flex-col font-sans selection:bg-[#00a854] selection:text-white">
      <LandingMotion />
      {/* Navigation Bar */}
      <Navbar customerUrl={customerUrl} merchantUrl={merchantUrl} />

      <main className="flex-1 w-full">
        {/* 1. Hero Section (The Awakening) - Scrub Video 1 via GSAP ScrollTrigger */}
        <HeroAwakening customerUrl={customerUrl} merchantUrl={merchantUrl} />

        {/* 1.5 Story & Philosophy Bridge - Transition between Awakening and Harsh Reality */}
        <StoryBridge />

        {/* 2. The Shocking Reality - Scrub Video 2 via GSAP ScrollTrigger & Dynamic Counter */}
        <ShockingReality />

        {/* 3. Giải Pháp GoSavingFood - Interactive Dual-Audience Tab (Consumer vs Merchant) */}
        <SolutionGoSavingFood customerUrl={customerUrl} merchantUrl={merchantUrl} />

        {/* 4. Lợi Ích & Tác Động - Interactive Impact & Savings Calculator */}
        <ImpactCalculator />

        {/* 5. Community / Testimonials & Store Partners Marquee */}
        <CommunityAndPartners />
      </main>

      <FoodMarquee />
      {/* 6. Footer */}
      <Footer customerUrl={customerUrl} merchantUrl={merchantUrl} />



    </div>
  );
}


