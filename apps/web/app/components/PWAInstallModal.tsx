"use client";
import { useEffect, useState } from "react";
import { X, ExternalLink } from "lucide-react";

interface PWAInstallModalProps {
  isOpen: boolean;
  target: "customer" | "merchant";
  onClose: () => void;
  customerUrl: string;
  merchantUrl: string;
}

function AndroidIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-1.0003 0-.5517.4482-1.0003.9993-1.0003.5517 0 1.0003.4486 1.0003 1.0003 0 .5517-.4486 1.0003-1.0003 1.0003m-11.046 0c-.5511 0-.9993-.4486-.9993-1.0003 0-.5517.4482-1.0003.9993-1.0003.5517 0 1.0003.4486 1.0003 1.0003 0 .5517-.4486 1.0003-1.0003 1.0003m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.4116 13.8533 8.082 12 8.082c-1.8533 0-3.5902.3296-5.1368.8676L4.841 5.4466a.4161.4161 0 00-.5677-.1521.4157.4157 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3432-4.1021-2.6889-7.5743-6.1185-9.4396" />
    </svg>
  );
}

function AppleIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.84c.66-.82 1.11-1.96.99-3.1-.96.04-2.12.64-2.8 1.44-.6.7-.1.14-1.87 2.97-.02.99 1.07 2.1 2.05 2.1.08-.01.17-.03.26-.06.63-.26 1.14-.73 1.4-1.35z" />
    </svg>
  );
}

export function PWAInstallModal({
  isOpen,
  target,
  onClose,
  customerUrl,
  merchantUrl,
}: PWAInstallModalProps) {
  const [activeTab, setActiveTab] = useState<"android" | "ios">("android");

  // Tự động nhận diện thiết bị khi mở popup
  useEffect(() => {
    if (typeof window === "undefined") return;
    const ua = navigator.userAgent || "";
    const isIOS =
      /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

    if (isIOS) {
      setActiveTab("ios");
    } else {
      setActiveTab("android");
    }
  }, [isOpen]);

  // Handle ESC key và chặn cuộn trang phía sau
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

  const isCustomer = target === "customer";
  const destUrl = isCustomer ? customerUrl : merchantUrl;

  const titleText = isCustomer
    ? "TẢI APP VÀ TRẢI NGHIỆM MÓN NGON MỖI NGÀY"
    : "TẢI APP VÀ BẮT ĐẦU KINH DOANH CÙNG GOSAVINGFOOD";

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm transition-opacity duration-200 animate-in fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="install-modal-title"
    >
      {/* Khung chữ nhật dọc cố định, to hơn trên laptop */}
      <div
        className="relative w-full max-w-[440px] sm:max-w-[500px] lg:max-w-[540px] min-h-[520px] sm:min-h-[580px] lg:min-h-[620px] bg-white text-[#0f2e1f] rounded-[28px] sm:rounded-[36px] shadow-2xl border border-slate-100 overflow-hidden transition-all scale-100 animate-in zoom-in-95 duration-200 p-6 sm:p-8 lg:p-9 flex flex-col justify-between gap-5 sm:gap-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Nút đóng */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 z-10 w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
          aria-label="Đóng popup"
        >
          <X size={18} strokeWidth={2.3} />
        </button>

        {/* 1. Header Title */}
        <div className="pr-8 pt-1">
          <h2
            id="install-modal-title"
            className="text-lg sm:text-xl lg:text-2xl font-black text-[#193B2C] leading-snug tracking-tight text-left"
          >
            {titleText}
          </h2>
        </div>

        {/* 2. Tabs: Chỉ 2 tab Android | iOS */}
        <div className="flex items-center border-b border-slate-200 text-xs sm:text-sm font-bold text-slate-500 select-none">
          <button
            type="button"
            onClick={() => setActiveTab("android")}
            className={`flex items-center gap-2 pb-2.5 px-3 sm:px-4 border-b-2 transition-all cursor-pointer ${
              activeTab === "android"
                ? "border-[#166B4A] text-[#166B4A] font-black"
                : "border-transparent hover:text-slate-900"
            }`}
          >
            <AndroidIcon className="w-4 h-4 sm:w-5 sm:h-5 text-[#166B4A]" />
            <span>Dành cho Android</span>
          </button>

          <span className="text-slate-300 pb-2.5 px-1 font-light">|</span>

          <button
            type="button"
            onClick={() => setActiveTab("ios")}
            className={`flex items-center gap-2 pb-2.5 px-3 sm:px-4 border-b-2 transition-all cursor-pointer ${
              activeTab === "ios"
                ? "border-[#166B4A] text-[#166B4A] font-black"
                : "border-transparent hover:text-slate-900"
            }`}
          >
            <AppleIcon className="w-4 h-4 sm:w-5 sm:h-5 text-[#166B4A]" />
            <span>Dành cho iOS</span>
          </button>
        </div>

        {/* 3. Tab Contents: 3 bước trực quan */}
        <div className="flex-1 flex flex-col justify-center py-1">
          {/* TAB 1: ANDROID (Sử dụng 3 ảnh thực tế, khoảng cách thưa thoáng) */}
          {activeTab === "android" && (
            <div className="flex flex-col">
              {/* Bước 1 */}
              <div className="flex items-center justify-between gap-4 py-3.5 sm:py-4.5 border-b border-slate-100">
                <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 pr-1">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#166B4A] text-white font-black flex items-center justify-center text-xs sm:text-sm flex-shrink-0 shadow-sm">
                    1
                  </div>
                  <div className="text-xs sm:text-[14px] lg:text-[15px] text-slate-800 leading-snug">
                    Nhấn vào <strong className="font-black text-slate-950">&quot;dấu ba chấm&quot;</strong> (⋮) ở góc phải
                  </div>
                </div>

                {/* Ảnh thực tế bước 1 */}
                <div className="w-32 sm:w-40 lg:w-44 aspect-[16/9] rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden flex-shrink-0 bg-white flex items-center justify-center">
                  <img
                    src="/images/install-guide/android-step-1.png"
                    alt="Nhấn vào dấu ba chấm"
                    className="w-full h-full object-cover block"
                  />
                </div>
              </div>

              {/* Bước 2 */}
              <div className="flex items-center justify-between gap-4 py-3.5 sm:py-4.5 border-b border-slate-100">
                <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 pr-1">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#166B4A] text-white font-black flex items-center justify-center text-xs sm:text-sm flex-shrink-0 shadow-sm">
                    2
                  </div>
                  <div className="text-xs sm:text-[14px] lg:text-[15px] text-slate-800 leading-snug">
                    Chọn <strong className="font-black text-slate-950">&quot;Install and create shortcut&quot;</strong>
                  </div>
                </div>

                {/* Ảnh thực tế bước 2 */}
                <div className="w-32 sm:w-40 lg:w-44 aspect-[16/9] rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden flex-shrink-0 bg-white flex items-center justify-center">
                  <img
                    src="/images/install-guide/android-step-2.png"
                    alt="Chọn Install and create shortcut"
                    className="w-full h-full object-cover block"
                  />
                </div>
              </div>

              {/* Bước 3 */}
              <div className="flex items-center justify-between gap-4 py-3.5 sm:py-4.5">
                <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 pr-1">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#166B4A] text-white font-black flex items-center justify-center text-xs sm:text-sm flex-shrink-0 shadow-sm">
                    3
                  </div>
                  <div className="text-xs sm:text-[14px] lg:text-[15px] text-slate-800 leading-snug">
                    Nhấn <strong className="font-black text-slate-950">&quot;Install&quot;</strong> để cài đặt ứng dụng GSF
                  </div>
                </div>

                {/* Ảnh thực tế bước 3 */}
                <div className="w-32 sm:w-40 lg:w-44 aspect-[16/9] rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden flex-shrink-0 bg-white flex items-center justify-center">
                  <img
                    src="/images/install-guide/android-step-3.png"
                    alt="Nhấn Install để cài đặt ứng dụng"
                    className="w-full h-full object-cover block"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: IOS (Safari - Sử dụng 3 ảnh thực tế, kích thước cố định như Android) */}
          {activeTab === "ios" && (
            <div className="flex flex-col">
              {/* Bước 1 */}
              <div className="flex items-center justify-between gap-4 py-3.5 sm:py-4.5 border-b border-slate-100">
                <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 pr-1">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#166B4A] text-white font-black flex items-center justify-center text-xs sm:text-sm flex-shrink-0 shadow-sm">
                    1
                  </div>
                  <div className="text-xs sm:text-[14px] lg:text-[15px] text-slate-800 leading-snug">
                    Nhấn vào <strong className="font-black text-slate-950">&quot;chia sẻ&quot;</strong>
                  </div>
                </div>

                {/* Ảnh thực tế bước 1 */}
                <div className="w-32 sm:w-40 lg:w-44 aspect-[16/9] rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden flex-shrink-0 bg-[#f8f9fb] flex items-center justify-center p-1 sm:p-1.5">
                  <img
                    src="/images/install-guide/ios-step-1.png"
                    alt="Nhấn vào chia sẻ"
                    className="max-w-full max-h-full object-contain block"
                  />
                </div>
              </div>

              {/* Bước 2 */}
              <div className="flex items-center justify-between gap-4 py-3.5 sm:py-4.5 border-b border-slate-100">
                <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 pr-1">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#166B4A] text-white font-black flex items-center justify-center text-xs sm:text-sm flex-shrink-0 shadow-sm">
                    2
                  </div>
                  <div className="text-xs sm:text-[14px] lg:text-[15px] text-slate-800 leading-snug">
                    Chọn <strong className="font-black text-slate-950">&quot;Thêm vào màn hình chính&quot;</strong>
                  </div>
                </div>

                {/* Ảnh thực tế bước 2 */}
                <div className="w-32 sm:w-40 lg:w-44 aspect-[16/9] rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden flex-shrink-0 bg-[#f8f9fb] flex items-center justify-center p-1 sm:p-1.5">
                  <img
                    src="/images/install-guide/ios-step-2.png"
                    alt="Chọn Thêm vào màn hình chính"
                    className="max-w-full max-h-full object-contain block"
                  />
                </div>
              </div>

              {/* Bước 3 */}
              <div className="flex items-center justify-between gap-4 py-3.5 sm:py-4.5">
                <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 pr-1">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#166B4A] text-white font-black flex items-center justify-center text-xs sm:text-sm flex-shrink-0 shadow-sm">
                    3
                  </div>
                  <div className="text-xs sm:text-[14px] lg:text-[15px] text-slate-800 leading-snug">
                    Chọn <strong className="font-black text-slate-950">&quot;Thêm&quot;</strong>
                  </div>
                </div>

                {/* Ảnh thực tế bước 3 */}
                <div className="w-32 sm:w-40 lg:w-44 aspect-[16/9] rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden flex-shrink-0 bg-[#f8f9fb] flex items-center justify-center p-1 sm:p-1.5">
                  <img
                    src="/images/install-guide/ios-step-3.png"
                    alt="Chọn Thêm"
                    className="max-w-full max-h-full object-contain block"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 4. Nút hành động chính dưới đáy */}
        <div className="pt-2">
          <a
            href={destUrl}
            onClick={(e) => {
              e.preventDefault();
              onClose();
              window.location.assign(destUrl);
            }}
            className="w-full flex items-center justify-center gap-2 py-3.5 sm:py-4 px-6 rounded-2xl bg-[#166B4A] hover:bg-[#12573C] text-white font-bold text-sm sm:text-base shadow-lg shadow-[#166B4A]/25 hover:shadow-xl hover:shadow-[#166B4A]/35 transition-all text-center cursor-pointer active:scale-[0.99]"
          >
            <ExternalLink size={18} />
            <span>Tiếp tục vào ứng dụng</span>
          </a>
        </div>
      </div>
    </div>
  );
}
