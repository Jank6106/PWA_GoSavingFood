"use client";
import { ArrowDownRight } from "lucide-react";
import Image from "next/image";

export function StoryBridge() {
  return <section className="story-bridge" id="story">
    <div className="editorial-shell">
      <h2 className="bridge-statement" data-reveal="words">
        {"Đến giờ đóng cửa. Chưa phải lúc khép lại một món ngon.".split(' ').map((word, i) => <span key={i}>{word} </span>)}
      </h2>
      <div className="bridge-bottom">
        <figure className="bridge-photograph" data-reveal>
          <div className="editorial-photo-frame">
          <Image src="/media/imagery/bakery-closing.webp" alt="Những chiếc bánh còn ngon được người thợ nhẹ nhàng đóng vào túi giấy tại quầy." width={1536} height={1024} sizes="(max-width: 700px) calc(100vw - 40px), 55vw" />
          </div>
        </figure>
        <div className="bridge-copy" data-reveal>
          <ArrowDownRight className="bridge-arrow" aria-hidden="true" />
          <p>Vẫn là mẻ bánh thơm. Vẫn là bữa ăn được chuẩn bị bằng sự chăm chút. Chỉ vì chưa tìm được người mua, thực phẩm còn ngon có thể kết thúc ở bãi rác.</p>
          <p>Cửa hàng mất đi giá trị đã tạo ra. Chúng ta bỏ lỡ một bữa ngon. Và hành tinh phải gánh thêm phần lãng phí.</p>
          <a className="text-link" href="#reality">Nhìn thẳng vào sự lãng phí <ArrowDownRight size={20} /></a>
        </div>
      </div>
    </div>
  </section>;
}
