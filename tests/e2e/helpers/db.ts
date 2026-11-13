import pg from 'pg';
import { getE2EConfig } from '../../../scripts/lib/e2e-env.mjs';

export const CUSTOMER_ID = 'c1000000-0000-0000-0000-000000000001';
export const MERCHANT_ID = 'd9c04baf-e9db-4ed1-8a59-6f5a94bb5521';
export const BAG_ID = '00c2cc90-f239-4b1b-bf4b-b471e379ef61';
export const STORE_ID = '2a9a946b-5984-4559-b0ed-5a56b5d4b946';

export async function withDB<T>(fn: (db: pg.Client) => Promise<T>): Promise<T> {
  const db = new pg.Client({ connectionString: getE2EConfig().databaseUrl });
  await db.connect();
  try { return await fn(db); } finally { await db.end(); }
}

export async function resetTestOrderState() {
  await withDB(async db => {
    await db.query('BEGIN');
    try {
      const ids = (await db.query('select id from public.orders where customer_id=$1', [CUSTOMER_ID])).rows.map(row => row.id);
      for (const table of ['reviews', 'issues', 'refund_requests', 'order_items']) {
        await db.query(`delete from public.${table} where order_id = any($1::uuid[])`, [ids]);
      }
      await db.query("delete from public.notifications where user_id=$1 or (user_id=$2 and coalesce(data->>'orderId',data->>'order_id')=any($3::text[]))", [CUSTOMER_ID, MERCHANT_ID, ids]);
      await db.query('delete from public.idempotency_keys where user_id=$1', [CUSTOMER_ID]);
      await db.query('delete from public.orders where customer_id=$1', [CUSTOMER_ID]);
      await db.query("update public.surprise_bags set quantity=10,is_available=true,status='active',pickup_start='00:00',pickup_end='23:59:59',expiry_date=(now() at time zone 'Asia/Ho_Chi_Minh')::date,expires_at=now()+interval '2 days' where id=$1", [BAG_ID]);
      await db.query("update public.vouchers set used_count=0 where code='TMU2026'");
      await db.query('COMMIT');
    } catch (error) { await db.query('ROLLBACK'); throw error; }
  });
}

export async function readTestOrder() {
  return withDB(async db => (await db.query('select * from public.orders where customer_id=$1 order by created_at desc limit 1', [CUSTOMER_ID])).rows[0]);
}
