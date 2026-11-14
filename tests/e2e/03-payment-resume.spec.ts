import { randomUUID } from 'node:crypto';
import { test, expect } from './helpers/fixtures';
import { loginCustomerSession } from './helpers/auth';
import { CUSTOMER_ID, STORE_ID, withDB } from './helpers/db';

test('Payment failure stops loading and explicit retry recovers the QR', async ({page,context})=>{
 const id=randomUUID();
 await withDB(db=>db.query(`insert into orders(id,customer_id,store_id,total_original_price,total_discount_price,
 final_amount,payment_method,qr_code,pickup_time) values($1::uuid,$2,$3,7500,7500,7500,'payos_vietqr',$1::text,now()+interval '1 hour')`,[id,CUSTOMER_ID,STORE_ID]));
 await loginCustomerSession(page,context);
 let attempts=0;
 await page.route('**/api/payos/create-payment',route=>{
  attempts++;
  return route.fulfill(attempts===1?{status:503,json:{success:false,error:'Dịch vụ thanh toán chưa truy cập được đơn hàng.'}}:
   {json:{success:true,orderCode:1000000999998,amount:7500,qrCode:'RETRY-SAME-ORDER-QR',checkoutUrl:'https://pay.payos.vn/web/test',
    accountNumber:'12345',accountName:'TEST',bin:'970418',description:'TEST',expiresAt:new Date(Date.now()+33*60000).toISOString()}});
 });
 await page.route('**/api/payos/check-status?**',route=>route.fulfill({json:{success:true,paid:false,status:'PENDING'}}));
 await page.goto('/explore/?view=payment&orderId='+id);
 await expect(page.getByText('Dịch vụ thanh toán chưa truy cập được đơn hàng.',{exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Tải ảnh mã QR',exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'Thử tải lại mã thanh toán',exact:true}).click();
 await expect(page.locator('.customer-payment-qr-wrap svg')).toBeVisible();
 await expect(page.getByRole('button',{name:'Tải ảnh mã QR',exact:true})).toBeEnabled();
 expect(attempts).toBe(2);
});

test('Pending orders stay in the payment tab until the server expires them', async ({page, context}) => {
  const id=randomUUID();
  await withDB(db=>db.query(`insert into orders(id,customer_id,store_id,total_original_price,total_discount_price,
    final_amount,payment_method,qr_code,pickup_time) values($1::uuid,$2,$3,70000,35000,35000,
    'payos_vietqr',$1::text,now()+interval '1 hour')`,[id,CUSTOMER_ID,STORE_ID]));
  await loginCustomerSession(page,context);
  await page.route('**/rest/v1/orders?**', async route=>{
    const response=await route.fetch();
    const body=await response.json();
    const adjust=(row: Record<string,unknown>)=>row.id===id
      ? {...row,payment_expires_at:new Date(Date.now()-60000).toISOString()} : row;
    await route.fulfill({response,json:Array.isArray(body)?body.map(adjust):adjust(body)});
  });
  await page.route('**/api/payos/cleanup-expired', route=>route.fulfill({json:{success:true,expiredCount:0}}));
  await page.goto('/explore/?tab=orders');
  await page.getByRole('button',{name:/^Chờ thanh toán/}).click();
  await expect(page.locator('.customer-order-card')).toHaveCount(1);
  expect((await withDB(db=>db.query('select status from orders where id=$1',[id]))).rows[0].status).toBe('pending_payment');
});

test('Payment reload reuses QR and focus reconciles a payment without cancelling', async ({ page, context }) => {
  const id = randomUUID();
  await withDB(db => db.query(`insert into orders(id,customer_id,store_id,total_original_price,total_discount_price,
    final_amount,payment_method,qr_code,pickup_time) values($1::uuid,$2,$3,70000,35000,35000,
    'payos_vietqr',$1::text,now()+interval '1 hour')`, [id,CUSTOMER_ID,STORE_ID]));
  await loginCustomerSession(page, context);
  const qr = { success: true, orderCode: 1000000999999, qrCode: 'ORIGINAL-PAYOS-QR-FIXTURE',
    checkoutUrl: 'https://pay.payos.vn/web/local-fixture', accountNumber: '12345',
    accountName: 'TEST', bin: '970418', description: 'GSF TEST', amount: 35000,
    expiresAt: new Date(Date.now()+33*60000).toISOString() };
  let creates=0, cancels=0, paid=false;
  await page.route('**/api/payos/create-payment', route => {
    creates++; return route.fulfill({ json: paid ? { success:true,paid:true,status:'PAID' } : qr });
  });
  await page.route('**/api/payos/check-status?**', route => route.fulfill({ json: { success:true,paid,status:paid?'PAID':'PENDING' } }));
  await page.route('**/api/payos/cancel-payment', route => { cancels++; return route.fulfill({json:{success:true}}); });
  await page.goto('/explore/?view=payment&orderId='+id);
  const svg=page.locator('.customer-payment-qr-wrap svg');
  await expect(svg).toBeVisible();
  const original=await svg.innerHTML();
  qr.expiresAt=new Date(Date.now()-60000).toISOString();
  await page.goto('/explore/?view=payment&orderId='+id);
  await expect(svg).toBeVisible();
  expect(await svg.innerHTML()).toBe(original);
  expect(creates).toBeGreaterThanOrEqual(2);
  await expect(page.getByText('Đang đối soát...', {exact:true})).toBeVisible();
  expect(cancels).toBe(0);
  // An old browser deadline must not cancel a valid DB payment when returning.
  await page.evaluate(() => sessionStorage.setItem('gsf_payment_expires_at','1'));
  paid=true;
  await withDB(db => db.query("update orders set status='paid',payment_status='success' where id=$1",[id]));
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.locator('.customer-payment-screen')).toHaveCount(0);
  expect(cancels).toBe(0);
});
