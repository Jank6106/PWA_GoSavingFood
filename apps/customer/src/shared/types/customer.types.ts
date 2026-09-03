export interface ProductDeal {
  id: string;
  shopName: string;
  title: string;
  category: 'bag' | 'bakery' | 'rice' | 'healthy';
  originalPrice: number;
  rescuePrice: number;
  discountPercentage: number;
  pickupTime: string;
  distance: string;
  stock: number;
  imageUrl?: string;
  icon: string;
  description?: string;
}

export interface CartItem {
  product: ProductDeal;
  quantity: number;
}

export interface CustomerOrder {
  id: string;
  orderCode: string;
  items: CartItem[];
  totalAmount: number;
  shopName: string;
  pickupTime: string;
  pickupAddress: string;
  status: 'ready' | 'completed' | 'cancelled';
  createdAt: string;
}

export type CustomerTab = 'home' | 'cart' | 'orders' | 'profile';
