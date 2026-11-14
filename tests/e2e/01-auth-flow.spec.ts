import { test, expect } from './helpers/fixtures';
import { loginCustomerSession, loginMerchantViaUI } from './helpers/auth';
import { bagURL, selectors } from './helpers/selectors';
import { CUSTOMER_ID, withDB } from './helpers/db';

test('Guest can browse, but adding a bag requires login', async ({ page }) => {
  await page.goto('/explore/');
  await page.getByRole('button', { name: 'Cá nhân', exact: true }).click();
  await expect(page.getByRole('button', { name: /Đăng nhập/ }).first()).toBeVisible();
  await page.goto(bagURL);
  await selectors.addBag(page).click();
  await expect(page.getByRole('dialog', { name: 'Đăng nhập' })).toBeVisible();
});

test('Customer session cannot enter the merchant dashboard or create a store', async ({ page, context }) => {
  await loginCustomerSession(page, context);
  await page.goto('/merchant/?tab=orders');
  await expect(page.getByRole('button', { name: 'Đăng nhập', exact: true })).toBeVisible();
  await expect(page.getByText('Local Test Bakery', { exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Đăng nhập', exact: true })).toBeVisible();
  await page.getByLabel('Email hoặc Số điện thoại').fill('customer.local@gosavingfood.test');
  await page.getByLabel('Mật khẩu', { exact: true }).fill('LocalTest123!');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('không có quyền quản lý cửa hàng');
  const stores = await withDB(async db => (await db.query('select id from public.stores where owner_user_id=$1', [CUSTOMER_ID])).rows);
  expect(stores).toEqual([]);
});

test('Merchant logs in through UI and retains the verified session after reload', async ({ page }) => {
  await loginMerchantViaUI(page);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Quản lý túi hàng' })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('gsf_merchant_cached_user') || '{}').displayName)).toBe('Local Test Bakery');
  await expect(page.getByRole('button', { name: 'Đăng nhập', exact: true })).toBeHidden();
});

test('Merchant logout clears the session and protects the dashboard', async ({ page }) => {
  await loginMerchantViaUI(page);
  await page.getByRole('button', { name: 'Cài đặt', exact: true }).filter({ visible: true }).click();
  await page.getByRole('button', { name: /Đăng xuất/ }).click();
  await expect(page.getByRole('button', { name: 'Đăng nhập', exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('gsf_merchant_cached_user'))).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem('sb-127-auth-token'))).toBeNull();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Đăng nhập', exact: true })).toBeVisible();
});
