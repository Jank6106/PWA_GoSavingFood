import Image from "next/image";

/** Real product screens in a restrained, responsive device frame. */
export function AppPhotograph({ audience }: { audience: "consumer" | "merchant" }) {
  const isConsumer = audience === "consumer";
  return (
    <figure className="app-photograph" data-reveal>
      <div className="app-photograph-stage">
        <div className="phone-device">
          <div className="phone-display">
            <Image
              key={audience}
              src={isConsumer ? "/media/imagery/customer-app-hd.webp" : "/media/imagery/merchant-app-hd.webp"}
              alt={isConsumer
                ? "Giao diện GoSavingFood: khám phá túi bất ngờ và cửa hàng gần bạn."
                : "Giao diện GoSavingFood Merchant: quản lý túi hàng, số lượng và giờ nhận."}
              width={1179}
              height={2556}
              unoptimized
            />
            <span className="phone-island" aria-hidden="true" />
          </div>
        </div>
      </div>
      <figcaption aria-live="polite">
        <strong>{isConsumer ? "Món ngon, ngay trong tầm tay." : "Thêm giá trị cho mỗi ngày bán."}</strong>
        <span>{isConsumer ? "Giao diện ứng dụng GoSavingFood" : "Giao diện ứng dụng GoSavingFood Merchant"}</span>
      </figcaption>
    </figure>
  );
}
