import {beforeEach,it,expect,vi} from 'vitest';
const fixture=vi.hoisted(()=>{
 const id='11111111-1111-4111-8111-111111111111',store='22222222-2222-4222-8222-222222222222',token='33333333-3333-4333-8333-333333333333';
 const rpc=vi.fn();
 const read=vi.fn();
 const query={select:()=>query,eq:()=>query,maybeSingle:()=>query,returns:()=>read()};
 return {id,store,token,rpc,read,query};
});
vi.mock('../apps/merchant/src/services/supabase',()=>({supabase:{
 from:()=>fixture.query,rpc:fixture.rpc,auth:{getUser:async()=>({data:{user:{id:'merchant'}},error:null})},
}}));
import {verifyOrderQR,updateMerchantOrderStatus} from '../apps/merchant/src/services/order.service';
beforeEach(()=>{
 fixture.rpc.mockReset();fixture.read.mockReset();
 fixture.read.mockResolvedValue({data:{id:fixture.id,store_id:fixture.store,pickup_token:fixture.token,
 qr_code:'GSF-DIAGNOSTIC',status:'ready_for_pickup',payment_status:'success',final_amount:7500,created_at:new Date().toISOString()},error:null});
});
it('QR rejection/network error never falls through to direct completion',async()=>{
 fixture.rpc.mockResolvedValue({data:{success:false},error:{message:'rejected'}});
 expect(await verifyOrderQR(fixture.id,fixture.token,fixture.store)).toBe(false);
 fixture.rpc.mockRejectedValue(new Error('offline'));
 expect(await verifyOrderQR(fixture.id,fixture.token,fixture.store)).toBe(false);
});
it('partial/manual code and a response for another order cannot complete this order',async()=>{
 expect(await verifyOrderQR(fixture.id,'1111',fixture.store)).toBe(false);
 expect(fixture.rpc).not.toHaveBeenCalled();
 fixture.rpc.mockResolvedValue({data:{success:true,order_id:'other',status:'completed'},error:null});
 expect(await verifyOrderQR(fixture.id,fixture.token,fixture.store)).toBe(false);
});
it('an RPC error returned as data rejects a status transition instead of reporting local success',async()=>{
 fixture.rpc.mockResolvedValue({data:null,error:{message:'forbidden'}});
 await expect(updateMerchantOrderStatus(fixture.id,'processing')).rejects.toThrow('Không thể cập nhật');
});
