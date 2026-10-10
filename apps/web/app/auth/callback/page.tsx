"use client";

import { useEffect } from "react";

function getCustomerTarget() {
  if (typeof window === "undefined") return "/explore/";
  const host = window.location.hostname;
  const isLocal =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.startsWith("192.168.") ||
    host.startsWith("10.") ||
    host.endsWith(".local");

  return isLocal ? "http://localhost:5173/explore/" : "/explore/";
}

export default function AuthCallbackPage() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      const search = window.location.search;
      const hash = window.location.hash;
      const base = getCustomerTarget();
      const target = base.endsWith("/") ? base : `${base}/`;
      window.location.replace(`${target}${search}${hash}`);
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8faf7] text-[#005639] font-sans">
      <div className="text-center p-6">
        <div className="w-10 h-10 border-4 border-[#008751] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="font-semibold text-base">Đang hoàn tất đăng nhập GoSavingFood...</p>
      </div>
    </div>
  );
}
