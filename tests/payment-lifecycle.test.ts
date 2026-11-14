import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import pg from 'pg';
import { randomUUID } from 'node:crypto';
import { getE2EConfig } from '../scripts/lib/e2e-env.mjs';
import { POST as createPayment } from '../apps/web/app/api/payos/create-payment/route';
import { GET as checkPayment } from '../apps/web/app/api/payos/check-status/route';

// Real local DB, simulated PayOS. Never forward external fetches.
const config = getE2EConfig();
const db = new pg.Client({ connectionString: config.databaseUrl });
const ids: string[] = [];
const provider = new Map<number, { status: string; id: string; amount: number }>();
const realFetch = globalThis.fetch;
let creations = 0;
beforeAll(async () => {
  await db.connect();
  vi.stubEnv('PAYOS_CLIENT_ID', 'local-fixture');
  vi.stubEnv('PAYOS_API_KEY', 'local-fixture');
  vi.stubEnv('PAYOS_CHECKSUM_KEY', 'local-fixture');
  vi.stubGlobal('fetch', async (url: string | URL | Request, options?: RequestInit) => {
    const target = new URL(typeof url === 'string' ? url : url instanceof URL ? url.href : url.url);
    if (['127.0.0.1', 'localhost'].includes(target.hostname)) return realFetch(url, options);
    if (target.hostname !== 'api-merchant.payos.vn') throw new Error('External network blocked');
    if (options?.method === 'POST') {
      const body = JSON.parse(String(options.body));
      expect(body.amount).toBe(35000);
      expect(body.expiredAt).toBeGreaterThan(Date.now() / 1000 + 30 * 60);
      if (provider.has(body.orderCode)) return Response.json({ code: '231', desc: 'duplicate' });
      creations++;
      provider.set(body.orderCode, { status: 'PENDING', id: 'fixture-' + body.orderCode, amount: body.amount });
      return Response.json({ code: '00', data: { orderCode: body.orderCode, paymentLinkId: 'fixture-' + body.orderCode,
        checkoutUrl: 'https://pay.payos.vn/web/fixture-' + body.orderCode, qrCode: 'EXACT-QR-' + body.orderCode,
        accountNumber: '12345', accountName: 'TEST', bin: '970418', description: body.description } });
    }
    const remote = provider.get(Number(target.pathname.split('/').pop()));
    if (!remote) return Response.json({ code: '404' });
    return Response.json({ code: '00', data: { ...remote, amountPaid: remote.status === 'PAID' ? remote.amount : 0 } });
  });
});
afterAll(async () => {
  vi.unstubAllGlobals(); vi.unstubAllEnvs();
  await db.query("delete from public.notifications where data->>'orderId'=any($1::text[])", [ids]);
  await db.query('delete from public.refund_requests where order_id=any($1::uuid[])', [ids]);
  await db.query('delete from public.orders where id=any($1::uuid[])', [ids]);
  await db.end();
});
async function order() {
  const id = randomUUID(); ids.push(id);
  await db.query(`insert into public.orders(id,customer_id,store_id,total_original_price,total_discount_price,
    final_amount,payment_method,qr_code,pickup_time) values($1::uuid,
    'c1000000-0000-0000-0000-000000000001','2a9a946b-5984-4559-b0ed-5a56b5d4b946',
    70000,35000,35000,'payos_vietqr',$1::text,now()+interval '1 hour')`, [id]);
  return id;
}
const create = (id: string) => createPayment(new Request('http://localhost/api/payos/create-payment', {
  method: 'POST', body: JSON.stringify({ orderId: id, amount: 1 }),
}));
describe('PayOS lifecycle on isolated Docker', () => {
  it('near-closing orders receive the full 33 minutes and survive early cleanup', async () => {
    await db.query('begin');
    try {
      const id=randomUUID();
      const bag='00c2cc90-f239-4b1b-bf4b-b471e379ef61';
      await db.query(`update surprise_bags set bag_type='daily',quantity=10,is_available=true,status='active',
        pickup_start='00:00',pickup_end=least(((now() at time zone 'Asia/Ho_Chi_Minh')+interval '2 minutes')::time,'23:59:59'::time),
        expiry_date=(now() at time zone 'Asia/Ho_Chi_Minh')::date,expires_at=now()+interval '1 day' where id=$1`,[bag]);
      const result=await db.query(`select public.create_order_transaction(
        $1::uuid,'c1000000-0000-0000-0000-000000000001'::uuid,'2a9a946b-5984-4559-b0ed-5a56b5d4b946'::uuid,
        $1::text,$2::jsonb,null,now()+interval '1 hour','payos_vietqr',null,70000,35000,0,35000,$1::text,null,null) result`,
        [id,JSON.stringify([{bagId:bag,quantity:1}])]);
      expect(result.rows[0].result.success).toBe(true);
      const row=(await db.query('select extract(epoch from(payment_expires_at-created_at)) seconds from orders where id=$1',[id])).rows[0];
      expect(Number(row.seconds)).toBe(33*60);
      await db.query('select cleanup_expired_pending_orders()');
      expect((await db.query('select status from orders where id=$1',[id])).rows[0].status).toBe('pending_payment');
    } finally { await db.query('rollback'); }
  });
  it('concurrent/reopened requests retain one code and exact QR; server uses DB amount', async () => {
    const id = await order(); const before = creations;
    const responses = await Promise.all([create(id), create(id)]);
    expect(responses.every(r => r.status === 200)).toBe(true);
    const [a, b] = await Promise.all(responses.map(r => r.json()));
    const again = await (await create(id)).json();
    expect(a.orderCode).toBe(b.orderCode);
    expect(again.qrCode).toBe('EXACT-QR-' + a.orderCode);
    expect(creations - before).toBe(1);
    expect(again.accountNumber).toBe('12345');
    await db.query('update orders set payos_qr_code=null where id=$1',[id]);
    const legacy=await (await create(id)).json();
    expect(legacy.checkoutUrl).toBe(again.checkoutUrl);
    expect(legacy.orderCode).toBe(again.orderCode);
    expect(creations-before).toBe(1);
  });
  it('paid reopen and repeated polling never recreate links or enqueue duplicate refunds', async () => {
    const id = await order(); const created = await (await create(id)).json();
    provider.get(created.orderCode)!.status = 'PAID';
    expect((await (await create(id)).json()).paid).toBe(true);
    await db.query("update orders set status='preparing' where id=$1", [id]);
    const before = creations;
    for (let i = 0; i < 3; i++) {
      expect((await (await checkPayment(new Request('http://localhost/api/payos/check-status?orderId=' + id + '&orderCode=999'))).json()).paid).toBe(true);
      await db.query('select confirm_payos_payment($1,null)', [created.orderCode]);
    }
    expect(creations).toBe(before);
    expect((await db.query('select status from orders where id=$1', [id])).rows[0].status).toBe('preparing');
    expect((await db.query('select count(*)::int n from refund_requests where order_id=$1', [id])).rows[0].n).toBe(0);
  });
  it('late payment is refunded once and does not revive an expired order', async () => {
    const id = await order(); const created = await (await create(id)).json();
    await db.query("update orders set status='expired' where id=$1", [id]);
    provider.get(created.orderCode)!.status = 'PAID';
    for (let i=0;i<2;i++) {
      const result = await (await checkPayment(new Request('http://localhost/api/payos/check-status?orderId=' + id))).json();
      expect(result.paid).toBe(false); expect(result.status).toBe('REFUND_PENDING');
    }
    expect((await db.query('select count(*)::int n from refund_requests where order_id=$1', [id])).rows[0].n).toBe(1);
  });
  it('terminal orders cannot create links and client roles cannot confirm payments', async () => {
    const id=await order();
    await db.query("update orders set status='cancelled' where id=$1", [id]);
    expect((await create(id)).status).toBe(409);
    expect((await db.query("select has_function_privilege('authenticated','public.confirm_payos_payment(bigint,text)','EXECUTE') allowed")).rows[0].allowed).toBe(false);
  });
});
