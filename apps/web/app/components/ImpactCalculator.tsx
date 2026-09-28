"use client";
import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
export function ImpactCalculator() {
  const [meals, setMeals] = useState(3);
  const monthly = Math.round(meals * 4.33);
  const food = monthly * .45;
  const co2 = Number(food.toFixed(1)) * 2.5;
  return <section id="calculator" className="impact-section">
    <div className="editorial-shell impact-layout">
      <div data-reveal><h2>Nhỏ với bạn.<br />Lớn với<br /><span>ngày mai.</span></h2><p>Một vài bữa ăn mỗi tuần. Một thay đổi có thể nhìn thấy, từ chiếc ví đến lượng thực phẩm được giữ lại.</p><a href="#solution" className="text-link">Bắt đầu từ bữa tiếp theo <ArrowUpRight size={20} /></a></div>
      <div className="impact-tool" data-reveal>
        <label htmlFor="rescue-meals">Mỗi tuần, bạn giải cứu bao nhiêu bữa?</label>
        <div className="meal-value"><strong>{meals}</strong><span>bữa / tuần</span></div>
        <input id="rescue-meals" type="range" min="1" max="14" value={meals} onChange={event => setMeals(Number(event.target.value))} />
        <div className="range-ends"><span>1 bữa</span><span>14 bữa</span></div>
        <div className="saving-output" aria-live="polite"><span>Ước tính tiết kiệm mỗi tháng</span><strong key={monthly}>{new Intl.NumberFormat('vi-VN').format(monthly * 45000)}<small>đ</small></strong></div>
        <div className="impact-facts"><div><strong>{food.toFixed(1)} kg</strong><span>thực phẩm được cứu</span></div><div><strong>{co2.toFixed(1)} kg</strong><span>CO₂ ước tính giảm</span></div><div><strong>{Math.max(1, Math.round(co2 / 1.83))} cây</strong><span>quy đổi tham khảo</span></div></div>
        <p className="calculation-note">Ước tính tham khảo: 45.000đ và 0,45 kg thực phẩm mỗi bữa; 4,33 tuần/tháng. Tác động thực tế thay đổi theo món ăn. Hệ số quy đổi: 2,5 kg CO₂/kg thực phẩm; 1,83 kg CO₂/cây/tháng.</p>
      </div>
    </div>
  </section>;
}
