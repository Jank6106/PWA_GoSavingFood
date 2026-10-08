"use client";

import React, { useRef } from "react";
import { useScrollVideo } from "./useScrollVideo";


export const ShockingReality: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useScrollVideo(sectionRef, videoRef);

  return (
    <section
      id="reality"
      ref={sectionRef}
      className="scroll-story"
    >
      {/* 1. LAYER NỀN TRÀN MÀN HÌNH CÓ GPU ACCELERATION */}
      <video
        aria-hidden="true"
        ref={videoRef}
        src="/media/problem-scrub.mp4"
        poster="/media/problem-poster.jpg"
        muted
        playsInline
        preload="auto"
        disablePictureInPicture
        controlsList="nodownload nofullscreen noremoteplayback"
        style={{
          willChange: "transform",
          transform: "translateZ(0)",
        }}
        className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none"
      />

      {/* 2. OVERLAY ÁNH SÁNG TỰ NHIÊN */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-black/75 z-1 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/35 z-1 pointer-events-none" />

      {/* 3. NỘI DUNG FOREGROUND */}
      <div className="story-content">
        {/* Central Dynamic Animated Stage (relative container with absolute inset-0) */}
        <div className="story-stage">
          {/* Intro Message: Discarding Food = Discarding Money */}
          <div
            data-story-step
            className="story-panel"
          >
            <h2 className="text-4xl sm:text-6xl lg:text-7xl font-semibold uppercase tracking-tight text-white leading-tight mb-6 drop-shadow-[0_4px_20px_rgba(0,0,0,0.85)]">
              Vứt Bỏ Đồ Ăn <br />
              Chính Là <span className="text-rose-400 underline decoration-rose-500/60 decoration-wavy decoration-2">Vứt Tiền Bạc</span> <br />
              & Hủy Hoại Hành Tinh.
            </h2>
            <p className="text-base sm:text-xl text-slate-200 font-medium leading-relaxed max-w-2xl drop-shadow-md">
              Một bữa ăn chưa đến tay người cần. Nguyên liệu, công sức và tài nguyên cũng theo đó bị bỏ đi — mỗi ngày.
            </p>
          </div>

          {/* Stat 1: 8 Million Tons */}
          <div
            data-story-step
            className="story-panel"
          >

            <div className="text-5xl sm:text-7xl lg:text-8xl font-semibold text-white font-sans leading-none mb-4 drop-shadow-[0_4px_20px_rgba(0,0,0,0.85)]">
              8.000.000+ <span className="text-rose-400 text-3xl sm:text-5xl font-sans">TẤN</span>
            </div>
            <p className="text-base sm:text-xl text-slate-200 font-medium max-w-xl leading-relaxed drop-shadow-md">
              Lượng thực phẩm lành lặn bị đổ bỏ mỗi năm tại Việt Nam khi vẫn còn nguyên giá trị sử dụng và dinh dưỡng (UNEP & Food Bank).
            </p>
          </div>

          {/* Stat 2: $3.9 Billion USD */}
          <div
            data-story-step
            className="story-panel"
          >

            <div className="text-5xl sm:text-7xl lg:text-8xl font-semibold text-white font-sans leading-none mb-4 drop-shadow-[0_4px_20px_rgba(0,0,0,0.85)]">
              3,9 TỶ <span className="text-amber-400 text-3xl sm:text-5xl font-sans">USD</span>
            </div>
            <p className="text-base sm:text-xl text-slate-200 font-medium max-w-xl leading-relaxed drop-shadow-md">
              Gần <strong className="text-white font-bold">2% GDP quốc gia</strong> bốc hơi theo bãi rác mỗi năm từ chi phí nguyên liệu và phí xử lý chất thải hữu cơ của các hàng quán.
            </p>
          </div>

          {/* Stat 3: Methane x25 CO2 */}
          <div
            data-story-step
            className="story-panel"
          >

            <div className="text-5xl sm:text-7xl lg:text-8xl font-semibold text-white font-sans leading-none mb-4 drop-shadow-[0_4px_20px_rgba(0,0,0,0.85)]">
              GẤP 25 <span className="text-[#00e676] text-3xl sm:text-5xl font-sans">LẦN CO₂</span>
            </div>
            <p className="text-base sm:text-xl text-slate-200 font-medium max-w-xl leading-relaxed drop-shadow-md">
              Rác thải hữu cơ phân hủy tại các bãi chôn lấp làm khí hậu ấm lên gấp 25 lần so với CO₂. Đã đến lúc chấm dứt sự lãng phí này cùng GoSavingFood!
            </p>
          </div>
        </div>

        <p className="story-media-error" role="status">Video chưa tải được. Bạn vẫn có thể cuộn để đọc câu chuyện.</p>
      </div>
    </section>
  );
};



