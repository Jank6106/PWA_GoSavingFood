import {
  mockBags,
  mockBanners,
  mockBrands,
  mockCategories,
  mockLocations,
  mockMerchants,
  mockNotifications,
  mockOrders,
  mockUser,
  mockVouchers,
} from './customer.mock';
import type { Order } from '../shared/types/customer.types';

const delay = (milliseconds = 120) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));

export const customerService = {
  async getHome() {
    await delay();
    return {
      banners: mockBanners,
      categories: mockCategories,
      brands: mockBrands,
      merchants: mockMerchants,
      bags: mockBags,
    };
  },
  async getBag(id: string) {
    await delay();
    return mockBags.find((bag) => bag.id === id) ?? null;
  },
  async getMerchant(id: string) {
    await delay();
    return {
      merchant: mockMerchants.find((merchant) => merchant.id === id) ?? null,
      bags: mockBags.filter((bag) => bag.merchantId === id),
    };
  },
  async getBrand(id: string) {
    await delay();
    return {
      brand: mockBrands.find((brand) => brand.id === id) ?? null,
      stores: mockMerchants.filter((merchant) => merchant.brandId === id),
    };
  },
  async getOrders() {
    await delay();
    return [...mockOrders];
  },
  async getNotifications() {
    await delay();
    return [...mockNotifications];
  },
  async getVouchers() {
    await delay();
    return [...mockVouchers];
  },
  async searchLocations(query: string) {
    await delay(80);
    const normalized = query.trim().toLocaleLowerCase('vi-VN');
    return normalized
      ? mockLocations.filter((location) =>
          `${location.name} ${location.address}`.toLocaleLowerCase('vi-VN').includes(normalized)
        )
      : [...mockLocations];
  },
  async login(name: string, phone: string) {
    await delay(300);
    return { ...mockUser, name: name || mockUser.name, phone };
  },
  async createOrder(order: Omit<Order, 'id' | 'orderCode' | 'createdAt'>) {
    await delay(450);
    return {
      ...order,
      id: `order-${Date.now()}`,
      orderCode: `GSF-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: new Date().toISOString(),
    } satisfies Order;
  },
};
