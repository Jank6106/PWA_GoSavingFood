import {beforeAll,afterAll,beforeEach,afterEach,it,expect} from 'vitest';
import pg from 'pg';
import {randomUUID} from 'node:crypto';
import {getE2EConfig} from '../scripts/lib/e2e-env.mjs';
const db=new pg.Client({connectionString:getE2EConfig().databaseUrl});
const customer='c1000000-0000-0000-0000-000000000001',merchant='d9c04baf-e9db-4ed1-8a59-6f5a94bb5521',store='2a9a946b-5984-4559-b0ed-5a56b5d4b946';
let id:string,token:string;
beforeAll(()=>db.connect());
afterAll(()=>db.end());
beforeEach(async()=>{
 await db.query('begin');id=randomUUID();token=randomUUID();
 await db.query(`insert into orders(id,customer_id,store_id,total_original_price,total_discount_price,final_amount,payment_method,qr_code,pickup_time,pickup_token)
 values($1::uuid,$2,$3,7500,7500,7500,'payos_vietqr',$1::text,now()+interval '1 hour',$4)`,[id,customer,store,token]);
});
afterEach(()=>db.query('rollback'));
async function actor(uid:string){await db.query("select set_config('request.jwt.claim.sub',$1,true)",[uid]);}
const transition=(target:string,role='merchant',uid=merchant)=>db.query('select transition_order_status_transaction($1,$2,$3,$4) result',[id,target,uid,role]);
it('customer cannot claim merchant privileges or verify the store pickup token',async()=>{
 await actor(customer);
 await expect(transition('preparing','merchant',customer)).rejects.toThrow('FORBIDDEN');
});
it('unpaid orders cannot be accepted by a merchant',async()=>{
 await actor(merchant);
 await expect(transition('preparing')).rejects.toThrow('INVALID_STATUS_TRANSITION');
});
it('pickup requires owner authentication, payment and exact live token',async()=>{
 await actor(merchant);
 const unpaid=await db.query('select verify_pickup_qr($1,$2) result',[token,store]);
 expect(unpaid.rows[0].result.success).toBe(false);
 await db.query("update orders set status='ready_for_pickup',payment_status='success' where id=$1",[id]);
 const wrong=await db.query('select verify_pickup_qr($1,$2) result',[randomUUID(),store]);
 expect(wrong.rows[0].result.success).toBe(false);
 await actor(customer);
 await expect(db.query('select verify_pickup_qr($1,$2)',[token,store])).rejects.toThrow('FORBIDDEN');
});
it('paid -> preparation -> ready -> verified pickup commits once and revokes the token',async()=>{
 await actor(merchant);
 await db.query("update orders set status='paid',payment_status='success' where id=$1",[id]);
 expect((await transition('preparing')).rows[0].result.success).toBe(true);
 expect((await transition('ready_for_pickup')).rows[0].result.success).toBe(true);
 expect((await db.query('select verify_pickup_qr($1,$2) result',[token,store])).rows[0].result.success).toBe(true);
 const row=(await db.query('select status,pickup_token from orders where id=$1',[id])).rows[0];
 expect(row).toEqual({status:'completed',pickup_token:null});
 expect((await db.query('select verify_pickup_qr($1,$2) result',[token,store])).rows[0].result.success).toBe(false);
 expect((await db.query("select has_function_privilege('authenticated','public._verify_pickup_qr_0020(uuid,uuid)','EXECUTE') allowed")).rows[0].allowed).toBe(false);
});
