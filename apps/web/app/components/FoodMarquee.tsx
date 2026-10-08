const foods = ["SALAD", "BÁNH MÌ", "CƠM VĂN PHÒNG", "BÁNH NGỌT", "SUSHI", "KIMBAP", "PIZZA", "THỊT", "HẢI SẢN", "RAU CỦ", "TRÁI CÂY", "SNACK", "ĐỒ UỐNG"];

export function FoodMarquee() {
  return <div className="food-divider partner-window" aria-label="Các loại đồ ăn">
    <div className="partner-band">
      {[0, 1].map(copy => <div className="partner-set" key={copy} aria-hidden={copy === 1}>
        {foods.map(food => <span key={food}>{food}<span className="food-dot" aria-hidden="true">·</span></span>)}
      </div>)}
    </div>
  </div>;
}
