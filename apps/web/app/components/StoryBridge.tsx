"use client";
import { ArrowDownRight } from "lucide-react";

export function StoryBridge() {
  return <section className="story-bridge" id="story">
    <div className="editorial-shell">
      <h2 className="bridge-statement" data-reveal="words">
        {"Đến giờ đóng cửa. Chưa phải lúc khép lại một món ngon.".split(' ').map((word, i) => <span key={i}>{word} </span>)}
      </h2>
      <div className="bridge-bottom">
        <ArrowDownRight className="bridge-arrow" aria-hidden="true" />
        <div data-reveal>
          <p>Vẫn là mẻ bánh thơm. Vẫn là bữa ăn được chuẩn bị bằng sự chăm chút. Chỉ vì chưa tìm được người mua, thực phẩm còn ngon có thể kết thúc ở bãi rác.</p>
          <p>Cửa hàng mất đi giá trị đã tạo ra. Chúng ta bỏ lỡ một bữa ngon. Và hành tinh phải gánh thêm phần lãng phí.</p>
          <a className="text-link" href="#reality">Nhìn thẳng vào sự lãng phí <ArrowDownRight size={20} /></a>
        </div>
      </div>
    </div>
  </section>;
}
