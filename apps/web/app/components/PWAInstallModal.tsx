"use client";

import React, { useEffect, useState } from "react";
import { X, Download, Share, PlusSquare, Smartphone, ExternalLink, QrCode, CheckCircle2 } from "lucide-react";
import { BrandMark } from "./BrandMark";

interface PWAInstallModalProps {
  isOpen: boolean;
  target: "customer" | "merchant";
  onClose: () => void;
  customerUrl: string;
  merchantUrl: string;
}

export function PWAInstallModal({
  isOpen,
  target,
  onClose,
  customerUrl,
  merchantUrl,
}: PWAInstallModalProps) {
  const [activeTarget, setActiveTarget] = useState<"customer" | "merchant">(target);
  const [platform, setPlatform] = useState<"ios" | "android" | "desktop">("desktop");

  useEffect(() => {
    setActiveTarget(target);
  }, [target]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ua = navigator.userAgent || "";
    const isIOSDevice =
      /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isAndroidDevice = /Android/i.test(ua);

    if (isIOSDevice) {
      setPlatform("ios");
    } else if (isAndroidDevice) {
      setPlatform("android");
    } else {
      setPlatform("desktop");
    }
  }, []);

  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isCustomer = activeTarget === "customer";
  const rawTargetUrl = isCustomer ? customerUrl : merchantUrl;
  const fullTargetUrl =
    typeof window !== "undefined"
      ? new URL(
          rawTargetUrl.startsWith("http")
            ? rawTargetUrl
            : `${window.location.origin}${rawTargetUrl}`
        )
      : new URL("https://gosavingfood.app/explore");

  fullTargetUrl.searchParams.set("install", "true");
  const installLink = fullTargetUrl.toString();

  const appName = isCustomer ? "GoSavingFood Khách Hàng" : "GoSavingFood Cửa Hàng";
  const appDesc = isCustomer
    ? "Săn suất ăn chất lượng giảm 50–80% mỗi ngày từ các nhà hàng, tiệm bánh xung quanh."
    : "Đăng bán món ăn dư cuối ngày chỉ trong 30 giây, thu hồi vốn và giảm lãng phí thực phẩm.";

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=10&data=${encodeURIComponent(
    installLink
  )}`;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md transition-opacity duration-200 animate-in fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="install-modal-title"
    >
      <div
        className="relative w-full max-w-lg bg-[#ffffff] text-[#0f291e] rounded-3xl shadow-2xl border border-slate-100 overflow-hidden transition-all scale-100 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Nút đóng */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
          aria-label="Đóng bảng hướng dẫn"
        >
          <X size={18} />
        </button>

        {/* Header với Icon và Tab chuyển ứng dụng */}
        <div className="bg-gradient-to-b from-[#f3f9f5] to-white p-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3.5 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-[#00e676] flex items-center justify-center shadow-lg shadow-[#00e676]/30 flex-shrink-0">
              <BrandMark className="w-8 h-8 text-[#002b1b]" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#00a854]/10 text-[#008a44] text-[11px] font-bold uppercase tracking-wider mb-0.5">
                <Download size={11} /> Ứng dụng PWA di động
              </div>
              <h3 id="install-modal-title" className="text-xl sm:text-2xl font-bold tracking-tight text-[#0b3321]">
                {appName}
              </h3>
            </div>
          </div>

          {/* Tab chọn app */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl text-xs font-bold text-slate-600">
            <button
              type="button"
              onClick={() => setActiveTarget("customer")}
              className={`py-2 px-3 rounded-lg transition-all cursor-pointer ${
                isCustomer
                  ? "bg-white text-[#006c40] shadow-sm font-extrabold"
                  : "hover:text-slate-900"
              }`}
            >
              Dành cho Khách Hàng
            </button>
            <button
              type="button"
              onClick={() => setActiveTarget("merchant")}
              className={`py-2 px-3 rounded-lg transition-all cursor-pointer ${
                !isCustomer
                  ? "bg-white text-[#006c40] shadow-sm font-extrabold"
                  : "hover:text-slate-900"
              }`}
            >
              Dành cho Cửa Hàng
            </button>
          </div>
        </div>

        {/* Nội dung chính: Hướng dẫn cài đặt theo thiết bị */}
        <div className="p-6 pt-5 max-h-[75vh] overflow-y-auto">
          <p className="text-xs sm:text-sm text-slate-600 font-medium mb-4 leading-relaxed">
            {appDesc}
          </p>

          {/* 1. Hướng dẫn trên iOS (iPhone/iPad) */}
          {platform === "ios" && (
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-[#f8faf8] border border-emerald-100 text-xs sm:text-sm space-y-3">
                <div className="font-bold text-[#006c40] flex items-center gap-1.5 text-sm">
                  <Smartphone size={16} /> 2 bước tải về màn hình chính trên iPhone:
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#00e676]/30 text-[#005c36] font-bold flex items-center justify-center flex-shrink-0 text-xs">
                    1
                  </div>
                  <div>
                    Nhấn vào biểu tượng <strong className="inline-flex items-center gap-1 text-[#006c40] bg-white px-1.5 py-0.5 rounded border border-slate-200"><Share size={12} /> Chia sẻ</strong> ở thanh công cụ dưới cùng của trình duyệt Safari.
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#00e676]/30 text-[#005c36] font-bold flex items-center justify-center flex-shrink-0 text-xs">
                    2
                  </div>
                  <div>
                    Cuộn xuống và chọn <strong className="inline-flex items-center gap-1 text-[#006c40] bg-white px-1.5 py-0.5 rounded border border-slate-200"><PlusSquare size={12} /> Thêm vào MH chính</strong> (Add to Home Screen).
                  </div>
                </div>
              </div>

              <a
                href={installLink}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-[#006c40] hover:bg-[#005230] text-white font-bold text-sm shadow-lg shadow-[#006c40]/25 transition-all text-center"
              >
                <span>Mở ứng dụng trên Safari ngay</span>
                <ExternalLink size={16} />
              </a>
            </div>
          )}

          {/* 2. Hướng dẫn trên Android */}
          {platform === "android" && (
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-[#f8faf8] border border-emerald-100 text-xs sm:text-sm space-y-3">
                <div className="font-bold text-[#006c40] flex items-center gap-1.5 text-sm">
                  <Smartphone size={16} /> Cách tải app về màn hình chính Android:
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={18} className="text-[#00a854] flex-shrink-0 mt-0.5" />
                  <div>
                    Nhấn nút <strong>"Mở & Cài đặt ngay"</strong> bên dưới. Trình duyệt Chrome sẽ tự động bật thông báo hỏi: <em>"Cài đặt ứng dụng {appName}?"</em>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={18} className="text-[#00a854] flex-shrink-0 mt-0.5" />
                  <div>
                    Nếu chưa hiện thông báo, nhấn biểu tượng <strong>3 chấm (⋮)</strong> ở góc trên bên phải Chrome rồi chọn <strong>"Cài đặt ứng dụng"</strong> (hoặc <em>Thêm vào màn hình chính</em>).
                  </div>
                </div>
              </div>

              <a
                href={installLink}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-[#00e676] hover:bg-[#69f0ae] text-[#002b1b] font-extrabold text-sm shadow-lg shadow-[#00e676]/30 transition-all text-center"
              >
                <Download size={18} />
                <span>Mở & Cài đặt ứng dụng ngay</span>
              </a>
            </div>
          )}

          {/* 3. Hướng dẫn trên Desktop (Quét mã QR để tải về điện thoại) */}
          {platform === "desktop" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl bg-[#f8faf8] border border-slate-200">
                <div className="p-2 bg-white rounded-xl shadow-md border border-slate-100 flex-shrink-0">
                  <img
                    src={qrImageUrl}
                    alt="Mã QR tải ứng dụng về điện thoại"
                    className="w-36 h-36 rounded-lg block"
                  />
                </div>
                <div className="space-y-2 text-left">
                  <div className="font-bold text-[#006c40] flex items-center gap-1.5 text-sm">
                    <QrCode size={16} /> Quét mã để tải về điện thoại:
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Dùng ứng dụng <strong>Camera</strong> trên điện thoại (iPhone hoặc Android) quét mã QR bên cạnh để mở và ghim ứng dụng ra màn hình chính.
                  </p>
                  <div className="text-[11px] text-slate-500 font-medium">
                    ✓ Hoạt động tức thì · Không tốn dung lượng máy
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <a
                  href={installLink}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs transition-colors"
                >
                  <span>Hoặc mở dùng thử trên máy tính này</span>
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Footer bảo đảm */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span>✓ Chuẩn Progressive Web App (PWA)</span>
          <span>Không cần qua App Store</span>
        </div>
      </div>
    </div>
  );
}
