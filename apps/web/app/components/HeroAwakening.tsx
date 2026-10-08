"use client";

import React, { useRef } from "react";
import { useScrollVideo } from "./useScrollVideo";
import { ArrowRight } from "lucide-react";

interface HeroAwakeningProps {
  customerUrl: string;
  merchantUrl: string;
}

export const HeroAwakening: React.FC<HeroAwakeningProps> = ({
  customerUrl,
  merchantUrl,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useScrollVideo(containerRef, videoRef);

  return (
    <section
      ref={containerRef}
      className="scroll-story hero-film"
    >
      {/* Thẻ <video> nằm ở LAYER NỀN TRÀN MÀN HÌNH */}
      <video
        aria-hidden="true"
        ref={videoRef}
        src="/media/hero-scrub.mp4"
        poster="/media/hero-poster.jpg"
        muted
        playsInline
        preload="auto"
        disablePictureInPicture
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          zIndex: 0,
          transform: "translate3d(0, 0, 0)",
          willChange: "transform",
          pointerEvents: "none",
        }}
      />

      <div className="film-dissolve" aria-hidden="true" />
      {/* Lớp Overlay bảo vệ tương phản */}
      <div className="absolute inset-0 bg-black/35 z-[1] pointer-events-none" />

      {/* Container nội dung (Text & Header) */}
      <div className="story-content">
        {/* Wrapper trung tâm chứa các step chữ */}
        <div className="story-stage">
          {/* Step 1 (Hero Title) */}
          <div data-story-step className="story-panel">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-semibold uppercase tracking-tight text-white leading-[1.08] mb-4 drop-shadow-md">
              Món ngon <br />
              xứng đáng có <br />
              <span className="text-[#00e676] ">
                cơ hội thứ hai.
              </span>
            </h1>

            <p className="text-sm sm:text-base lg:text-lg text-slate-200 font-medium leading-relaxed max-w-2xl mb-6 drop-shadow-md">
              Những tiệm bánh, nhà hàng và siêu thị yêu thích quanh bạn vẫn còn rất nhiều món ngon chưa bán hết trước giờ đóng cửa. Hãy giải cứu thực phẩm chất lượng với giá <strong className="inline-stat">giảm 50–80%</strong>. Ăn ngon. Ít lãng phí.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 pointer-events-auto">
              <a
                href={customerUrl}
                className="inline-flex items-center gap-2 rounded-full bg-[#00e676] px-6 sm:px-8 py-3 sm:py-3.5 text-xs sm:text-sm font-semibold text-[#002b1b] shadow-xl shadow-[#00e676]/35 hover:bg-[#69f0ae] hover:scale-105 active:scale-95 transition-all"
              >
                <span>Trải nghiệm ứng dụng ngay</span>
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </a>

              <a
                href={merchantUrl}
                className="inline-flex items-center gap-2 rounded-full px-6 sm:px-8 py-3 sm:py-3.5 text-xs sm:text-sm font-bold text-white border-2 border-white/60 hover:border-white hover:bg-white/10 backdrop-blur-sm transition-all"
              >
                <span>Dành cho cửa hàng</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Step 2 (18:00 Chiều) */}
          <div data-story-step className="story-panel">
            
            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-semibold uppercase tracking-tight text-white leading-tight mb-4 drop-shadow-md">
              Thực Phẩm Vẫn <br />
              <span className="text-[#00e676] ">
                Tươi Ngon Chuẩn Vị
              </span>
            </h2>
            <p className="text-sm sm:text-base lg:text-lg text-slate-200 font-medium max-w-xl leading-relaxed drop-shadow-md">
              Hạn sử dụng trong ngày đang dần khép lại. Dù vẫn giữ trọn vẹn dinh dưỡng và độ thơm ngon hảo hạng, hàng ngàn suất ăn chuẩn bị bị loại bỏ nếu không kịp đến tay bạn.
            </p>
          </div>

          {/* Step 3 (22:00 Đêm) */}
          <div data-story-step className="story-panel">
            
            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-semibold uppercase tracking-tight text-white leading-tight mb-4 drop-shadow-md">
              Đừng Để Sự Lãng Phí <br />
              Lấy Đi <span className="text-rose-400 ">Màu Xanh Tương Lai</span>
            </h2>
            <p className="text-sm sm:text-base lg:text-lg text-slate-200 font-medium max-w-xl leading-relaxed drop-shadow-md">
              Chỉ cần một thao tác nhỏ trên GoSavingFood, bạn có thể biến thực phẩm suýt bị vứt bỏ thành bữa ăn tiết kiệm và nhân văn cho cộng đồng.
            </p>
          </div>
        </div>

        <p className="story-media-error" role="status">Video chưa tải được. Bạn vẫn có thể cuộn để đọc câu chuyện.</p>
      </div>
    </section>
  );
};



