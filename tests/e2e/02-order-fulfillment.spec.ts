import { devices } from '@playwright/test';
import { test, expect, isolateNetwork } from './helpers/fixtures';
import { loginCustomerSession, loginMerchantViaUI } from './helpers/auth';
import { bagURL, selectors } from './helpers/selectors';
import { BAG_ID, readTestOrder, withDB } from './helpers/db';

test('0đ voucher order: checkout, bidirectional Realtime, merchant preparation and QR handover', async ({ browser }) => {
  const customerContext = await browser.newContext({ ...devices['Pixel 7'], timezoneId: 'Asia/Ho_Chi_Minh', baseURL: 'http://localhost:3000', serviceWorkers: 'block' });
  const merchantContext = await browser.newContext({ viewport: { width: 1280, height: 800 }, timezoneId: 'Asia/Ho_Chi_Minh', baseURL: 'http://localhost:3000', serviceWorkers: 'block' });
  if (test.info().retry === 1) {
    await customerContext.tracing.start({ screenshots: true, snapshots: true, sources: true });
    await merchantContext.tracing.start({ screenshots: true, snapshots: true, sources: true });
  }
  const forbiddenCustomer = await isolateNetwork(customerContext);
  const forbiddenMerchant = await isolateNetwork(merchantContext);
  const customer = await customerContext.newPage();
  const merchant = await merchantContext.newPage();
  const frames = { customer: [] as string[], merchant: [] as string[] };
  for (const [page, messages] of [[customer, frames.customer], [merchant, frames.merchant]] as const) {
    page.on('websocket', socket => socket.on('framereceived', event => messages.push(event.payload.toString())));
  }
  const paymentCalls: string[] = [];
  customer.on('request', request => { if (/\/api\/payos\/create-payment/.test(request.url())) paymentCalls.push(request.url()); });
  try {
    await loginMerchantViaUI(merchant);
    await merchant.getByRole('button', { name: 'Đơn hàng', exact: true }).filter({ visible: true }).click();
    await expect(merchant.getByRole('button', { name: /^Chờ xác nhận/ })).toBeVisible();
    await loginCustomerSession(customer, customerContext);
    await customer.goto(bagURL);
    await selectors.addBag(customer).click();
    const quantity = customer.getByRole('button', { name: /^Thêm 1 túi/ });
    await expect(quantity).toBeVisible();
    await quantity.click();
    await expect(customer.getByRole('dialog', { name: 'Chọn số lượng' })).toBeHidden();
    await customer.getByRole('button', { name: 'Xem giỏ', exact: true }).click();
    await selectors.checkout(customer).click();
    await customer.getByText('Chọn hoặc nhập mã khuyến mãi', { exact: true }).click();
    await selectors.voucher(customer).fill('TMU2026');
    await customer.getByRole('button', { name: 'Áp dụng', exact: true }).click();
    await expect(customer.getByText('Đã áp dụng', { exact: true })).toBeVisible();
    await expect(customer.locator('.customer-order-summary p').filter({ hasText: 'Tổng thanh toán' })).toContainText('0đ');
    await selectors.placeOrder(customer).click();
    await expect.poll(async () => (await readTestOrder())?.status).toBe('paid');
    const order = await readTestOrder();
    expect(Number(order.final_amount)).toBe(0);
    expect(order.payment_status).toBe('success');
    expect(paymentCalls).toEqual([]);
    // Require actual postgres_changes frames, not a polling refresh passing as Realtime.
    await expect.poll(() => frames.merchant.some(frame => frame.includes('postgres_changes') && frame.includes(order.id))).toBe(true);
    const card = selectors.orderCard(merchant).filter({ hasText: 'Local Daily Surprise Bag' });
    await expect(card).toBeVisible();
    await customer.getByRole('button', { name: 'Xem đơn hàng', exact: true }).click();
    await customer.locator('.customer-order-card').filter({ hasText: 'Local Daily Surprise Bag' }).click();
    await expect(customer.getByRole('heading', { name: 'Đã thanh toán · Chờ quán nhận đơn' })).toBeVisible();
    await card.getByRole('button', { name: 'Xác nhận', exact: true }).click();
    await expect(customer.getByRole('heading', { name: 'Quán đang chuẩn bị món' })).toBeVisible();
    await expect(customer.getByRole('button', { name: 'Hủy đơn hàng này' })).toBeHidden();
    await expect.poll(() => frames.customer.some(frame => frame.includes('postgres_changes') && frame.includes('preparing'))).toBe(true);
    await card.getByRole('button', { name: 'Chuẩn bị xong' }).click();
    await expect(customer.getByRole('heading', { name: 'Sẵn sàng lấy món' })).toBeVisible();
    await expect(selectors.pickupQR(customer)).toBeVisible();
    const ready = await readTestOrder();
    expect(ready.status).toBe('ready_for_pickup');
    expect(ready.pickup_token).toBeTruthy();
    await merchant.getByRole('button', { name: /^Quét mã QR/ }).filter({ visible: true }).click();
    await merchant.getByText('Nhập mã đơn thủ công', { exact: true }).click();
    await merchant.getByPlaceholder('Ví dụ: GSF-102948').fill(ready.pickup_token);
    await merchant.getByRole('button', { name: 'Kiểm tra & Xác thực mã' }).click();
    await merchant.getByRole('button', { name: 'Bàn giao món cho khách' }).click();
    await expect(customer.getByRole('heading', { name: 'Đơn hàng đã hoàn thành' })).toBeVisible();
    await expect.poll(async () => (await readTestOrder())?.status).toBe('completed');
    await expect.poll(() => frames.customer.some(frame => frame.includes('postgres_changes') && frame.includes('completed'))).toBe(true);
    await customer.getByRole('button', { name: 'Viết đánh giá cho đơn hàng' }).click();
    await expect(customer.getByRole('heading', { name: /Đánh giá/ }).first()).toBeVisible();
    const inventory = await withDB(async db => (await db.query('select quantity from public.surprise_bags where id=$1', [BAG_ID])).rows[0]);
    expect(inventory.quantity).toBe(9);
    expect(paymentCalls).toEqual([]);
    expect(forbiddenCustomer).toEqual([]);
    expect(forbiddenMerchant).toEqual([]);
  } catch (error) {
    for (const [name, page] of [['customer', customer], ['merchant', merchant]] as const) {
      if (!page.isClosed()) {
        await test.info().attach(`${name}-snapshot`, { body: await page.locator('body').ariaSnapshot().catch(() => ''), contentType: 'text/plain' });
        const screenshot = await page.screenshot().catch(() => null);
        if (screenshot) await test.info().attach(`${name}-screenshot`, { body: screenshot, contentType: 'image/png' });
      }
    }
    throw error;
  } finally {
    if (test.info().retry === 1) {
      for (const [name, context] of [['customer', customerContext], ['merchant', merchantContext]] as const) {
        const path = test.info().outputPath(`${name}-trace.zip`);
        const saved = await context.tracing.stop({ path }).then(() => true).catch(() => false);
        if (saved) await test.info().attach(`${name}-trace`, { path, contentType: 'application/zip' });
      }
    }
    await customerContext.close().catch(() => {});
    await merchantContext.close().catch(() => {});
  }
});
