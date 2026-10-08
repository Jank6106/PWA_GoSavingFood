"use client";
import { BrandMark } from "./BrandMark";
import { ArrowUpRight } from "lucide-react";
export function Footer({ customerUrl, merchantUrl }: { customerUrl: string; merchantUrl: string }) {
  return <footer className="site-footer"><div className="editorial-shell">
    <div className="footer-invitation" data-reveal><h2>Hẹn một bữa ngon.<br />Bớt một phần lãng phí.</h2><div><a href={customerUrl} className="editorial-button">Khám phá ngay <ArrowUpRight size={20} /></a><a href={merchantUrl} className="text-link">Dành cho cửa hàng <ArrowUpRight size={18} /></a></div></div>
    <div className="footer-wordmark" aria-label="GoSavingFood">GoSavingFood</div>
    <nav aria-label="Liên kết cuối trang" className="footer-links"><a href="#reality">Thực trạng</a><a href="#solution">Cách hoạt động</a><a href="#calculator">Tính tác động</a><a href="#community">Cộng đồng</a></nav>
    <div className="footer-legal"><span className="footer-brand"><BrandMark className="footer-logo" />© 2026 GoSavingFood</span><span>Ăn ngon. Ít lãng phí.</span></div>
  </div></footer>;
}

