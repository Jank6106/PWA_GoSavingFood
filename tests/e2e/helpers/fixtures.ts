import { test as base, expect, type BrowserContext } from '@playwright/test';
import { resetTestOrderState } from './db';

export async function isolateNetwork(context: BrowserContext) {
  const forbidden: string[] = [];
  await context.routeWebSocket('**/*', socket => {
    if (['localhost', '127.0.0.1', '[::1]'].includes(new URL(socket.url()).hostname)) socket.connectToServer();
    else { forbidden.push(new URL(socket.url()).origin); socket.close(); }
  });
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) return route.continue();
    if (/supabase|payos/i.test(url.hostname) && /\/auth\/|\/rest\/|\/realtime\/|payos/i.test(url.href)) forbidden.push(url.origin + url.pathname);
    return route.abort();
  });
  return forbidden;
}

export const test = base.extend({
  context: async ({ context }, use) => {
    const forbidden = await isolateNetwork(context);
    await use(context);
    expect(forbidden, 'No production backend requests').toEqual([]);
  },
});
test.beforeEach(async () => { await resetTestOrderState(); });
test.afterEach(async () => { await resetTestOrderState(); });
export { expect };
