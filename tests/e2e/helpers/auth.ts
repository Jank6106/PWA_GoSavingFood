import { createClient } from '@supabase/supabase-js';
import { expect, type Page, type BrowserContext } from '@playwright/test';
import { getE2EConfig } from '../../../scripts/lib/e2e-env.mjs';

export async function loginCustomerSession(page: Page, context: BrowserContext) {
  const { url, anonKey } = getE2EConfig();
  const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.signInWithPassword({ email: 'customer.local@gosavingfood.test', password: 'LocalTest123!' });
  if (error) throw error;
  const session = data.session!;
  await context.addInitScript(({ session, key }) => {
    if (location.origin !== 'http://localhost:3000') return;
    localStorage.setItem(key, JSON.stringify(session));
    localStorage.setItem('gsf_cached_customer_user', JSON.stringify({
      id: session.user.id, name: 'Local Test Customer', email: session.user.email, phone: '0987654321',
    }));
  }, { session, key: `sb-${new URL(url).hostname.split('.')[0]}-auth-token` });
  void page;
}

export async function loginMerchantViaUI(page: Page) {
  await page.goto('/merchant/');
  await page.getByLabel('Email hoặc Số điện thoại').fill('merchant.local@gosavingfood.test');
  await page.getByLabel('Mật khẩu', { exact: true }).fill('LocalTest123!');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Quản lý túi hàng' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('gsf_merchant_cached_user') || '{}').displayName)).toBe('Local Test Bakery');
  await expect(page.getByRole('button', { name: 'Đăng nhập', exact: true })).toBeHidden();
}
