import type { Page } from '@playwright/test';
import { BAG_ID } from './db';
export const bagURL = `/explore/?view=bag&id=${BAG_ID}`;
export const selectors = {
  addBag: (page: Page) => page.getByRole('button', { name: /Thêm vào giỏ/i }).filter({ visible: true }),
  cart: (page: Page) => page.getByRole('button', { name: /Giỏ hàng/ }).filter({ visible: true }),
  checkout: (page: Page) => page.getByRole('button', { name: 'Tiếp tục đặt hàng' }),
  voucher: (page: Page) => page.getByPlaceholder('Nhập mã ưu đãi...'),
  placeOrder: (page: Page) => page.getByRole('button', { name: 'Tiếp tục thanh toán' }),
  orderCard: (page: Page) => page.locator('article.merchant-order-card'),
  pickupQR: (page: Page) => page.locator('.customer-pickup-code svg'),
};
