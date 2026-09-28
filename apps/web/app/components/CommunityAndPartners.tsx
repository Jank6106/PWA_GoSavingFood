"use client";

import React from "react";


export const CommunityAndPartners: React.FC = () => {
  const foods = ["Salad", "Bánh mì", "Cơm văn phòng", "Bánh ngọt", "Rau củ", "Trái cây", "Đồ uống"];

  const testimonials = [
    {
      name: "Nguyễn Hoàng Linh",
      role: "Sinh viên năm 3, ĐH Thương Mại",
      tag: "Tiết kiệm ~850.000đ/tháng",
      avatarBg: "bg-emerald-100 text-emerald-800",
      content:
        "Là sinh viên, tiền ăn chiếm phần lớn chi tiêu của mình. Dùng GoSavingFood, mình mua được bánh mì nướng và cơm văn phòng của các chuỗi xịn giảm đến 60%. Tan học rẽ qua lấy đồ siêu tiện!",
    },
    {
      name: "Trần Minh Tuấn",
      role: "Kỹ sư phần mềm, Phố Duy Tân",
      tag: "Dân OT công nghệ",
      avatarBg: "bg-blue-100 text-blue-800",
      content:
        "Mình thường tan ca muộn sau 19h. Săn các phần cơm đùi gà hoặc khay thịt mát siêu thị mang về nấu vừa nhanh vừa rẻ lại chuẩn an toàn. Mô hình tự đến lấy không mất đồng phí ship nào!",
    },
    {
      name: "Chị Mai Lan",
      role: "Quản lý chuỗi Bakery & Cafe",
      tag: "Đối tác Cửa Hàng B2B",
      avatarBg: "bg-amber-100 text-amber-800",
      content:
        "Trước đây mỗi tối phải tiêu hủy số bánh nướng dư trong ngày xót ruột vô cùng. Nhờ GoSavingFood Merchant, nhân viên chỉ mất 30 giây đăng bán sau 18h là khách ghé lấy hết sạch. Vừa thu hồi vốn vừa tránh lãng phí!",
    },
  ];

  return <section id="community" className="community-section">
    <div className="editorial-shell">
      <div className="section-intro" data-reveal><h2>Ngon hơn khi<br /><span>cùng nhau.</span></h2><p>Những góc nhìn từ người mua và cửa hàng trên hành trình giảm lãng phí thực phẩm.</p></div>
    </div>
      <div className="partner-window" aria-label="Các loại đồ ăn">
        <div className="partner-band">
          {[0,1].map(copy => <div className="partner-set" key={copy} aria-hidden={copy === 1}>{foods.map(food => <span key={food}>{food}</span>)}</div>)}
        </div>
      </div>
    <div className="editorial-shell">
      <div className="testimonials">{testimonials.map((item,i) => <figure key={item.name} data-reveal className={i === 0 ? 'quote-featured' : ''}><blockquote>{item.content}</blockquote><figcaption><strong>{item.name}</strong><span>{item.role}</span></figcaption></figure>)}</div>
    </div>
  </section>;
};

