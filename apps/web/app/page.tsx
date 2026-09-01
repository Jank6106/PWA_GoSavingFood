"use client";

import React, { useState } from "react";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"customer" | "merchant">("customer");

  const [customerUrl, setCustomerUrl] = useState("/customer");
  const [merchantUrl, setMerchantUrl] = useState("/merchant");

  React.useEffect(() => {
    if (window.location.hostname === "localhost") {
      setCustomerUrl("http://localhost:5173");
      setMerchantUrl("http://localhost:5174");
    }
  }, []);

  return (
    <div className="relative min-h-screen bg-[#090d16] text-slate-100 bg-radial-glow selection:bg-emerald-500 selection:text-white">
      {/* Background Subtle Shapes */}
      <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[600px] w-full max-w-7xl -translate-x-1/2 overflow-hidden blur-3xl opacity-30">
        <div className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-emerald-500/30 animate-pulse-glow" />
        <div className="absolute right-10 top-40 h-80 w-80 rounded-full bg-amber-500/20 animate-pulse-glow" style={{ animationDelay: "1.5s" }} />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 glass-panel border-b border-slate-800/60 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-emerald-400 font-bold text-slate-950 shadow-lg shadow-emerald-500/20 text-xl">
              🌱
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white">Go Saving <span className="gradient-text-emerald">Food</span></span>
              <span className="ml-2 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-400 border border-emerald-500/20">
                PWA Hub
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#pwa-apps" className="transition hover:text-emerald-400">PWA Apps</a>
            <a href="#pwa-features" className="transition hover:text-emerald-400">Ưu điểm PWA</a>
            <a href="#how-it-works" className="transition hover:text-emerald-400">Cách hoạt động</a>
            <a href="#impact" className="transition hover:text-emerald-400">Tác động Social</a>
          </nav>

          <div className="flex items-center gap-3">
            <a
              href={customerUrl}
              className="hidden sm:inline-flex items-center justify-center rounded-lg bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-700 border border-slate-700"
            >
              App Khách Hàng
            </a>
            <a
              href={merchantUrl}
              className="inline-flex items-center justify-center rounded-lg bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 transition hover:bg-emerald-400 shadow-md shadow-emerald-500/20"
            >
              App Cửa Hàng 🏪
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative px-4 pt-16 pb-12 sm:px-6 sm:pt-24 lg:px-8 text-center max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20 mb-6">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
          Nền tảng Giải cứu Thực phẩm theo mô hình PWA hàng đầu
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-6xl lg:text-7xl leading-tight">
          Giải Cứu Món Ngon <br />
          <span className="gradient-text-emerald">Tiết Kiệm 80%</span> & Bảo Vệ Môi Trường
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-slate-300 max-w-3xl mx-auto font-normal leading-relaxed">
          Go Saving Food kết nối người tiêu dùng thông minh với các cửa hàng, nhà hàng để giải cứu suất ăn ngon trong ngày. Trải nghiệm mượt mà, không cần tải App từ Store nhờ công nghệ <span className="text-emerald-400 font-semibold">Progressive Web App (PWA)</span>.
        </p>

        {/* PWA App Navigation Cards */}
        <div id="pwa-apps" className="mt-14 grid gap-6 sm:grid-cols-2 text-left">
          {/* Customer App Launcher Card */}
          <div className="glass-card rounded-2xl p-6 sm:p-8 relative overflow-hidden group border border-slate-800 hover:border-emerald-500/40">
            <div className="absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-all blur-2xl" />
            <div className="flex items-center justify-between mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 text-2xl font-bold border border-emerald-500/30">
                🍏
              </div>
              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
                PWA Khách Hàng
              </span>
            </div>

            <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-emerald-300 transition">
              Customer App
            </h3>
            <p className="text-slate-300 text-sm leading-relaxed mb-6">
              Dành cho người tiêu dùng. Khám phá các phần ăn ngon, thực phẩm tươi giảm giá 50% - 80% tại các cửa hàng xung quanh bạn.
            </p>

            <ul className="space-y-2 text-xs text-slate-400 mb-6">
              <li className="flex items-center gap-2">
                <span className="text-emerald-400 font-bold">✓</span> Nhận thông báo suất ăn hời tức thì
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-400 font-bold">✓</span> Đặt chỗ & thanh toán nhanh gọn trên PWA
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-400 font-bold">✓</span> Thêm ứng dụng trực tiếp vào Màn hình chính
              </li>
            </ul>

            <a
              href={customerUrl}
              className="flex items-center justify-center gap-2 w-full rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-400 shadow-lg shadow-emerald-500/25 group-hover:scale-[1.02]"
            >
              Truy cập App Khách Hàng 🚀
            </a>
          </div>

          {/* Merchant App Launcher Card */}
          <div className="glass-card rounded-2xl p-6 sm:p-8 relative overflow-hidden group border border-slate-800 hover:border-amber-500/40">
            <div className="absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-amber-500/10 group-hover:bg-amber-500/20 transition-all blur-2xl" />
            <div className="flex items-center justify-between mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 text-2xl font-bold border border-amber-500/30">
                🏪
              </div>
              <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400 border border-amber-500/20">
                PWA Cửa Hàng
              </span>
            </div>

            <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-amber-300 transition">
              Merchant App
            </h3>
            <p className="text-slate-300 text-sm leading-relaxed mb-6">
              Dành cho đối tác cửa hàng, quán ăn, siêu thị. Đăng bán món thừa cuối ngày chỉ trong 30 giây để thu hồi vốn & giảm lãng phí.
            </p>

            <ul className="space-y-2 text-xs text-slate-400 mb-6">
              <li className="flex items-center gap-2">
                <span className="text-amber-400 font-bold">✓</span> Tạo bài đăng sản phẩm giảm giá siêu tốc
              </li>
              <li className="flex items-center gap-2">
                <span className="text-amber-400 font-bold">✓</span> Quản lý đơn hàng & xác nhận mã giải cứu
              </li>
              <li className="flex items-center gap-2">
                <span className="text-amber-400 font-bold">✓</span> Thống kê doanh thu & tác động CO2 giảm thiểu
              </li>
            </ul>

            <a
              href={merchantUrl}
              className="flex items-center justify-center gap-2 w-full rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-3 text-sm font-bold text-slate-950 transition hover:from-amber-400 hover:to-amber-500 shadow-lg shadow-amber-500/25 group-hover:scale-[1.02]"
            >
              Truy cập App Cửa Hàng 💼
            </a>
          </div>
        </div>
      </section>

      {/* PWA Features Section */}
      <section id="pwa-features" className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-800/80">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
            Sức Mạnh Của Mô Hình <span className="gradient-text-emerald">PWA (Progressive Web App)</span>
          </h2>
          <p className="mt-4 text-slate-400 text-sm sm:text-base">
            Không cần chờ tải xuống hàng trăm Megabyte từ App Store hay CH Play. Bạn có thể sử dụng ứng dụng ngay lập tức trên mọi thiết bị.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="glass-card rounded-xl p-6 border border-slate-800">
            <div className="text-3xl mb-3">⚡</div>
            <h3 className="text-lg font-bold text-white mb-2">Không Cần Tải App</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Mở trực tiếp từ trình duyệt web. Tiết kiệm bộ nhớ điện thoại và dùng được ngay chỉ sau 1 cú nhấp.
            </p>
          </div>

          <div className="glass-card rounded-xl p-6 border border-slate-800">
            <div className="text-3xl mb-3">📲</div>
            <h3 className="text-lg font-bold text-white mb-2">Thêm Vào Màn Hình Chính</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Dễ dàng ghim biểu tượng PWA ra Màn hình chính (Add to Home Screen) để mở như ứng dụng gốc Native.
            </p>
          </div>

          <div className="glass-card rounded-xl p-6 border border-slate-800">
            <div className="text-3xl mb-3">🔔</div>
            <h3 className="text-lg font-bold text-white mb-2">Thông Báo Đẩy Realtime</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Cập nhật tức thì các món ngon giảm giá sâu vừa được cửa hàng gần bạn đăng bán trong ngày.
            </p>
          </div>

          <div className="glass-card rounded-xl p-6 border border-slate-800">
            <div className="text-3xl mb-3">📶</div>
            <h3 className="text-lg font-bold text-white mb-2">Tốc Độ & Hỗ Trợ Offline</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Công nghệ Caching thông minh giúp trang tải siêu tốc và xem lại danh sách món ăn ngay cả khi mất mạng.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-800/80">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
            Quy Trình Hoạt Động
          </h2>
          <p className="mt-3 text-slate-400 text-sm">
            Đơn giản - Nhanh chóng - Tiết kiệm cho cả Khách hàng & Cửa hàng
          </p>

          {/* Toggle Tab */}
          <div className="mt-6 inline-flex rounded-xl bg-slate-900 p-1.5 border border-slate-800">
            <button
              onClick={() => setActiveTab("customer")}
              className={`px-5 py-2 text-xs font-bold rounded-lg transition ${
                activeTab === "customer"
                  ? "bg-emerald-500 text-slate-950 shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Dành Cho Khách Hàng 🍏
            </button>
            <button
              onClick={() => setActiveTab("merchant")}
              className={`px-5 py-2 text-xs font-bold rounded-lg transition ${
                activeTab === "merchant"
                  ? "bg-amber-500 text-slate-950 shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Dành Cho Cửa Hàng 🏪
            </button>
          </div>
        </div>

        {activeTab === "customer" ? (
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="glass-panel rounded-2xl p-6 text-center border border-slate-800">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xl mb-4">
                1
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Mở PWA & Tìm Kiếm</h4>
              <p className="text-slate-400 text-xs leading-relaxed">
                Định vị vị trí của bạn để tìm các nhà hàng, tiệm bánh xung quanh đang có thực phẩm dư thừa chất lượng cao.
              </p>
            </div>
            <div className="glass-panel rounded-2xl p-6 text-center border border-slate-800">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xl mb-4">
                2
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Đặt Suất Ăn Giá Rẻ</h4>
              <p className="text-slate-400 text-xs leading-relaxed">
                Chọn suất ăn "Túi Mật Bí" hoặc món ăn yêu thích với giá giảm tới 80% so với giá gốc.
              </p>
            </div>
            <div className="glass-panel rounded-2xl p-6 text-center border border-slate-800">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xl mb-4">
                3
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Nhận Hàng Tại Cửa Hàng</h4>
              <p className="text-slate-400 text-xs leading-relaxed">
                Ghé cửa hàng vào khung giờ hẹn, đưa mã PWA xác nhận và nhận phần ăn nóng hổi tươi ngon!
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="glass-panel rounded-2xl p-6 text-center border border-slate-800">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 font-bold text-xl mb-4">
                1
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Đăng Bài Trong 30 Giây</h4>
              <p className="text-slate-400 text-xs leading-relaxed">
                Chụp ảnh món ăn dư thừa cuối ngày, đặt mức giá giải cứu hấp dẫn và phát hành ngay trên Merchant PWA.
              </p>
            </div>
            <div className="glass-panel rounded-2xl p-6 text-center border border-slate-800">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 font-bold text-xl mb-4">
                2
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Nhận Đơn Tự Động</h4>
              <p className="text-slate-400 text-xs leading-relaxed">
                Khách hàng xung quanh nhận thông báo và đặt đơn ngay. Bạn chỉ cần đóng gói sản phẩm chờ khách tới lấy.
              </p>
            </div>
            <div className="glass-panel rounded-2xl p-6 text-center border border-slate-800">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 font-bold text-xl mb-4">
                3
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Tăng Doanh Thu & Giảm Rác</h4>
              <p className="text-slate-400 text-xs leading-relaxed">
                Biến thực phẩm có nguy cơ lãng phí thành lợi nhuận thực tế và nâng cao hình ảnh xanh cho thương hiệu.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Impact Stats */}
      <section id="impact" className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-800/80">
        <div className="glass-panel rounded-3xl p-8 sm:p-12 relative overflow-hidden border border-emerald-500/20 bg-gradient-to-b from-slate-900/90 to-slate-950">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-3xl font-extrabold text-white">Tác Động Tích Cực Đến Cộng Đồng</h2>
            <p className="mt-2 text-slate-400 text-xs sm:text-sm">
              Mỗi đơn hàng giải cứu thực phẩm là một hành động nhỏ bảo vệ hành tinh xanh
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-4 text-center">
            <div className="p-4">
              <div className="text-4xl font-extrabold text-emerald-400">50.000+</div>
              <div className="mt-2 text-xs font-medium text-slate-400">Suất Ăn Đã Giải Cứu</div>
            </div>
            <div className="p-4">
              <div className="text-4xl font-extrabold text-amber-400">120+ Tấn</div>
              <div className="mt-2 text-xs font-medium text-slate-400">Khí Thải CO2 Đã Giảm</div>
            </div>
            <div className="p-4">
              <div className="text-4xl font-extrabold text-emerald-400">1,5 Tỷ+</div>
              <div className="mt-2 text-xs font-medium text-slate-400">VNĐ Người Dùng Tiết Kiệm</div>
            </div>
            <div className="p-4">
              <div className="text-4xl font-extrabold text-amber-400">350+</div>
              <div className="mt-2 text-xs font-medium text-slate-400">Đối Tác Cửa Hàng</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-10 px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-300">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white">Go Saving Food PWA</span>
            <span>© 2026. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-6">
            <a href={customerUrl} className="hover:text-emerald-400 transition">Customer PWA App</a>
            <a href={merchantUrl} className="hover:text-amber-400 transition">Merchant PWA App</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

