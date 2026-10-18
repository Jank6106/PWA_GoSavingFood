"use client";
import { useState } from "react";
import { ArrowUpRight, MapPin, ShoppingBag, QrCode, Store, CircleDollarSign, Leaf } from "lucide-react";
import { AppPhotograph } from "./AppPhotograph";

const journeys = {
  consumer: [
    { title: "Tìm món ngon quanh bạn.", copy: "Khám phá tiệm bánh, nhà hàng và siêu thị có thực phẩm cần giải cứu. Chọn món, xem giá và thời gian nhận phù hợp.", detail: "Quanh bạn · 1–3 km", icon: MapPin },
    { title: "Giữ phần ngon của mình.", copy: "Chọn suất ăn yêu thích, đặt trước và thanh toán ngay trên ứng dụng. Một bữa ngon với mức giá dễ chịu hơn.", detail: "Tiết kiệm 50–80%", icon: ShoppingBag },
    { title: "Ghé lấy. Thưởng thức.", copy: "Tiện đường đi học hay tan làm, ghé cửa hàng trong giờ hẹn. Đưa mã QR, nhận món và mang điều ngon lành về nhà.", detail: "Tự đến lấy · không phí giao hàng", icon: QrCode },
  ],
  merchant: [
    { title: "Đăng phần ngon còn lại.", copy: "Chụp ảnh, nhập số lượng và đặt ưu đãi cho thực phẩm chưa bán hết trong ngày. Chọn khung giờ khách đến nhận.", detail: "Thao tác nhanh cuối ca", icon: Store },
    { title: "Giữ lại giá trị đã tạo ra.", copy: "Thu hồi chi phí nguyên liệu từ những sản phẩm suýt bị bỏ đi. Kết nối với người mua mới ngay trong khu vực.", detail: "Thêm doanh thu, bớt lãng phí", icon: CircleDollarSign },
    { title: "Trao món ngon tận tay.", copy: "Quét mã QR khi khách đến lấy. Theo dõi các đơn hàng và lượng thực phẩm được giải cứu trên ứng dụng cửa hàng.", detail: "Một cách khép lại ngày tốt hơn", icon: Leaf },
  ],
};
export function SolutionGoSavingFood({
  customerUrl,
  merchantUrl,
  onInstall,
}: {
  customerUrl: string;
  merchantUrl: string;
  onInstall?: (target: "customer" | "merchant") => void;
}) {
  const [audience, setAudience] = useState<"consumer" | "merchant">("consumer");
  return <section id="solution" className="solution-section editorial-shell">
    <div className="section-intro" data-reveal><h2>Một bữa ngon.<br /><span>Một lựa chọn tốt.</span></h2><p>GoSavingFood kết nối những món ngon chưa bán hết với người đang cần chúng. Bắt đầu từ ba bước nhỏ.</p></div>
    <div className="audience-switch" role="group" aria-label="Chọn hướng dẫn">
      <button aria-pressed={audience === 'consumer'} onClick={() => setAudience('consumer')}>Tôi muốn tìm món ngon</button>
      <button aria-pressed={audience === 'merchant'} onClick={() => setAudience('merchant')}>Tôi có cửa hàng</button>
    </div>
    <div className="solution-layout">
      <AppPhotograph audience={audience} />
      <div className="solution-instructions">
    <div className="journey" key={audience}>
      {journeys[audience].map((step, i) => <article className="journey-row" key={step.title} >
        <span className="journey-number">0{i + 1}</span><div><h3>{step.title}</h3><p>{step.copy}</p></div><div className="journey-detail"><step.icon size={36} strokeWidth={1.3} /><span>{step.detail}</span></div>
      </article>)}
    </div>
    <a
      className="editorial-button"
      href={audience === 'consumer' ? customerUrl : merchantUrl}
      onClick={(e) => {
        e.preventDefault();
        const target = audience === "consumer" ? "customer" : "merchant";
        if (onInstall) onInstall(target);
        else window.location.assign(audience === "consumer" ? customerUrl : merchantUrl);
      }}
    >
      {audience === 'consumer' ? 'Tìm món ngon gần tôi' : 'Đăng ký cửa hàng'}
      <ArrowUpRight size={20} />
    </a>
      </div>
    </div>
  </section>;
}
