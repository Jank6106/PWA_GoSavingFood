import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../scripts/lib/env.mjs';

const {
  url: SUPABASE_URL,
  anonKey: ANON_KEY,
  serviceRoleKey: SERVICE_KEY,
} = getSupabaseConfig({ requireAnon: true, requireServiceRole: true });

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});
const supabaseAnon = createClient(SUPABASE_URL, ANON_KEY);

const timestamp = Date.now();
const emailCustomerA = `audit_cust_a_${timestamp}@gmail.com`;
const emailCustomerB = `audit_cust_b_${timestamp}@gmail.com`;
const testPassword = 'AuditSecurePassword123!';

let userAId: string;
let userBId: string;
let clientCustomerA: SupabaseClient;
let clientCustomerB: SupabaseClient;
let defaultStoreId: string;
let createdOrderIds: string[] = [];
let createdBagIds: string[] = [];
let createdIdempotencyKeys: string[] = [];

describe('PRODUCTION BACKEND AUDIT & STRESS SUITE (Kiểm định Chất lượng Production Backend)', () => {
  beforeAll(async () => {
    // 1. Lấy một cửa hàng thực tế làm ngữ cảnh test
    const { data: stores } = await supabaseAdmin.from('stores').select('id').limit(1);
    expect(stores).toBeDefined();
    expect(stores!.length).toBeGreaterThan(0);
    defaultStoreId = stores![0].id;

    // 2. Tạo User A (Khách hàng A)
    const { data: userAData, error: errA } = await supabaseAdmin.auth.admin.createUser({
      email: emailCustomerA,
      password: testPassword,
      email_confirm: true,
      user_metadata: { name: 'Audit Customer A', phone: '0977000111' }
    });
    if (errA) throw errA;
    userAId = userAData.user.id;

    // 3. Tạo User B (Khách hàng B)
    const { data: userBData, error: errB } = await supabaseAdmin.auth.admin.createUser({
      email: emailCustomerB,
      password: testPassword,
      email_confirm: true,
      user_metadata: { name: 'Audit Customer B', phone: '0977000222' }
    });
    if (errB) throw errB;
    userBId = userBData.user.id;

    // 4. Khởi tạo Client đã xác thực cho Customer A và Customer B
    clientCustomerA = createClient(SUPABASE_URL, ANON_KEY);
    await clientCustomerA.auth.signInWithPassword({ email: emailCustomerA, password: testPassword });

    clientCustomerB = createClient(SUPABASE_URL, ANON_KEY);
    await clientCustomerB.auth.signInWithPassword({ email: emailCustomerB, password: testPassword });
  }, 20000);

  afterAll(async () => {
    // Dọn dẹp 100% dữ liệu phát sinh trong quá trình kiểm thử
    if (createdOrderIds.length > 0) {
      await supabaseAdmin.from('order_items').delete().in('order_id', createdOrderIds);
      await supabaseAdmin.from('refund_requests').delete().in('order_id', createdOrderIds);
      await supabaseAdmin.from('orders').delete().in('id', createdOrderIds);
    }

    if (createdIdempotencyKeys.length > 0) {
      await supabaseAdmin.from('idempotency_keys').delete().in('key', createdIdempotencyKeys);
    }

    if (createdBagIds.length > 0) {
      await supabaseAdmin.from('surprise_bags').delete().in('id', createdBagIds);
    }

    if (userAId) {
      await supabaseAdmin.from('notifications').delete().eq('user_id', userAId);
      await supabaseAdmin.from('users').delete().eq('id', userAId);
      await supabaseAdmin.auth.admin.deleteUser(userAId);
    }

    if (userBId) {
      await supabaseAdmin.from('notifications').delete().eq('user_id', userBId);
      await supabaseAdmin.from('users').delete().eq('id', userBId);
      await supabaseAdmin.auth.admin.deleteUser(userBId);
    }

    // Bảo hiểm: Dọn mọi bản ghi audit mồ côi
    await supabaseAdmin.from('users').delete().like('email', 'audit_cust_%');
  }, 30000);

  // ============================================================================
  // NHÓM 1: BẢO MẬT DỮ LIỆU & RLS (DATA ISOLATION & PERMISSION)
  // ============================================================================
  describe('1. Kiểm định RLS & Cách ly dữ liệu khách hàng (Data Isolation)', () => {
    it('1.1. Người dùng chưa đăng nhập (Anon) không thể đọc bảng nhạy cảm (orders, notifications, users)', async () => {
      const { data: anonOrders } = await supabaseAnon.from('orders').select('*').limit(5);
      expect(anonOrders).toEqual([]);

      const { data: anonNotifs } = await supabaseAnon.from('notifications').select('*').limit(5);
      expect(anonNotifs).toEqual([]);

      const { data: anonUsers } = await supabaseAnon.from('users').select('*').limit(5);
      expect(anonUsers).toEqual([]);
    });

    it('1.2. Khách hàng A không thể xem đơn hàng của Khách hàng B qua RLS', async () => {
      // Tạo một đơn hàng thuộc về Khách hàng B với mã QR động
      const orderBId = crypto.randomUUID();
      createdOrderIds.push(orderBId);

      const { error: insErr } = await supabaseAdmin.from('orders').insert({
        id: orderBId,
        customer_id: userBId,
        store_id: defaultStoreId,
        total_original_price: 60000,
        total_discount_price: 35000,
        final_amount: 35000,
        qr_code: crypto.randomUUID(),
        pickup_time: new Date(Date.now() + 3600000).toISOString(),
        status: 'pending_payment',
        payment_method: 'payos_vietqr',
        payment_status: 'pending'
      });
      expect(insErr).toBeNull();

      // Khách hàng A cố gắng truy vấn đơn của Khách hàng B
      const { data: ordersReadByA } = await clientCustomerA.from('orders').select('*').eq('id', orderBId);
      expect(ordersReadByA).toEqual([]); // RLS lọc sạch, không trả về dữ liệu

      // Khách hàng B tự đọc đơn của mình -> Phải thấy
      const { data: ordersReadByB } = await clientCustomerB.from('orders').select('*').eq('id', orderBId);
      expect(ordersReadByB).toHaveLength(1);
      expect(ordersReadByB![0].id).toBe(orderBId);
    });

    it('1.3. Khách hàng A không thể sửa hoặc xóa trực tiếp đơn hàng của Khách hàng B', async () => {
      const orderBId = createdOrderIds[0];

      // Thử cập nhật trạng thái đơn của B
      const { data: updatedRows } = await clientCustomerA
        .from('orders')
        .update({ status: 'completed' })
        .eq('id', orderBId)
        .select();

      expect(updatedRows).toEqual([]); // 0 dòng bị ảnh hưởng bởi A

      // Đảm bảo đơn của B vẫn giữ nguyên trạng thái cũ
      const { data: orderAfter } = await supabaseAdmin.from('orders').select('status').eq('id', orderBId).single();
      expect(orderAfter?.status).toBe('pending_payment');
    });

    it('1.4. Khách hàng A không thể xem thông báo (notifications) của Khách hàng B', async () => {
      const notifBId = crypto.randomUUID();
      await supabaseAdmin.from('notifications').insert({
        id: notifBId,
        user_id: userBId,
        icon: 'order',
        title: 'Bí mật của B',
        body: 'Thông tin bảo mật đơn hàng của B'
      });

      // A truy vấn thông báo của B
      const { data: notifsSeenByA } = await clientCustomerA.from('notifications').select('*').eq('id', notifBId);
      expect(notifsSeenByA).toEqual([]); // RLS lọc sạch

      // Cleanup notification
      await supabaseAdmin.from('notifications').delete().eq('id', notifBId);
    });

    it('1.5. Khách hàng A không thể sửa hồ sơ cá nhân của Khách hàng B (public.users)', async () => {
      const { data: hackedProfile } = await clientCustomerA
        .from('users')
        .update({ role: 'admin', name: 'Hacked by A' })
        .eq('id', userBId)
        .select();

      expect(hackedProfile).toEqual([]);

      // Kiểm tra trong DB: B vẫn là customer và giữ nguyên tên
      const { data: profileB } = await supabaseAdmin.from('users').select('role, name').eq('id', userBId).single();
      expect(profileB?.role).toBe('customer');
      expect(profileB?.name).toBe('Audit Customer B');
    });
  });

  // ============================================================================
  // NHÓM 2: BẢO VỆ CHỐNG LEO THANG ĐẶC QUYỀN (PRIVILEGE ESCALATION PREVENTION)
  // ============================================================================
  describe('2. Kiểm định Chống leo thang đặc quyền & Xâm nhập trái phép RPC', () => {
    it('2.1. RPC transition_order_status_transaction từ chối khi Khách hàng giả mạo role = admin', async () => {
      const orderBId = createdOrderIds[0];

      // Customer A cố tình gọi hàm với p_actor_role = 'admin' để hủy đơn của B
      const { data, error } = await clientCustomerA.rpc('transition_order_status_transaction', {
        p_order_id: orderBId,
        p_target_status: 'cancelled',
        p_actor_id: userAId,
        p_actor_role: 'admin',
        p_reason: 'Tấn công leo thang đặc quyền'
      });

      expect(data).toBeNull();
      expect(error).toBeDefined();
      expect(error?.message).toContain('FORBIDDEN');
    });

    it('2.2. RPC transition_order_status_transaction từ chối khi Khách hàng A cố thao tác đơn của Khách hàng B', async () => {
      const orderBId = createdOrderIds[0];

      // Customer A gọi hàm với vai trò customer nhưng nhắm vào đơn của B
      const { data, error } = await clientCustomerA.rpc('transition_order_status_transaction', {
        p_order_id: orderBId,
        p_target_status: 'cancelled',
        p_actor_id: userAId,
        p_actor_role: 'customer',
        p_reason: 'Khách A muốn hủy đơn của B'
      });

      expect(data).toBeNull();
      expect(error).toBeDefined();
      expect(error?.message).toContain('FORBIDDEN');
    });

    it('2.3. Khách hàng B hủy đơn của chính mình thành công (khi đơn chưa làm)', async () => {
      const orderBId = createdOrderIds[0];

      const { data, error } = await clientCustomerB.rpc('transition_order_status_transaction', {
        p_order_id: orderBId,
        p_target_status: 'cancelled',
        p_actor_id: userBId,
        p_actor_role: 'customer',
        p_reason: 'Tôi đổi ý không mua nữa'
      });

      expect(error).toBeNull();
      expect(data?.success).toBe(true);
      expect(data?.status).toBe('cancelled');

      const { data: orderInDB } = await supabaseAdmin.from('orders').select('status, cancel_reason').eq('id', orderBId).single();
      expect(orderInDB?.status).toBe('cancelled');
      expect(orderInDB?.cancel_reason).toBe('Tôi đổi ý không mua nữa');
    });

    it('2.4. Anonymous bị cấm tuyệt đối khi gọi delete_user_account', async () => {
      const { error } = await supabaseAnon.rpc('delete_user_account', { p_user_id: userBId });
      expect(error).toBeDefined();
      expect(error?.message).toContain('permission denied');
    });

    it('2.5. Khách hàng A không thể xóa tài khoản của Khách hàng B qua delete_user_account', async () => {
      const { data } = await clientCustomerA.rpc('delete_user_account', { p_user_id: userBId });
      expect(data?.success).toBe(false);
      expect(data?.error).toBe('FORBIDDEN');
      expect(data?.message).toContain('Bạn không có quyền');

      // Đảm bảo User B vẫn tồn tại
      const { data: checkB } = await supabaseAdmin.from('users').select('id').eq('id', userBId).single();
      expect(checkB?.id).toBe(userBId);
    });
  });

  // ============================================================================
  // NHÓM 3: ĐUA TỒN KHO & RACE CONDITION (CONCURRENCY & INVENTORY ATOMICITY)
  // ============================================================================
  describe('3. Kiểm định Đua tồn kho song song (High-Concurrency Race Condition)', () => {
    it('3.1. Hai khách hàng đồng thời đặt túi hàng cuối cùng (stock = 1) -> Chỉ duy nhất 1 đơn thành công, tồn kho không âm', async () => {
      // 1. Tạo 1 túi bất ngờ test đặc biệt chỉ có đúng 1 suất (quantity = 1)
      const { data: newBag, error: errBag } = await supabaseAdmin.from('surprise_bags').insert({
        store_id: defaultStoreId,
        name: 'Túi Thử Nghiệm Race Condition Audit',
        category: 'other',
        bag_type: 'shelf_life',
        expiry_date: '2099-12-31',
        pickup_start: '00:00:00',
        pickup_end: '23:59:59',
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        original_price: 80000,
        discount_price: 40000,
        quantity: 1, // CHÍNH XÁC 1 SUẤT
        is_available: true,
        status: 'active'
      }).select().single();

      expect(errBag).toBeNull();
      expect(newBag).toBeDefined();
      createdBagIds.push(newBag.id);

      const orderIdA = crypto.randomUUID();
      const orderIdB = crypto.randomUUID();
      const keyA = `race_key_a_${timestamp}_${Math.random()}`;
      const keyB = `race_key_b_${timestamp}_${Math.random()}`;
      createdOrderIds.push(orderIdA, orderIdB);
      createdIdempotencyKeys.push(keyA, keyB);

      const payloadA = {
        p_id: orderIdA,
        p_store_id: defaultStoreId,
        p_idempotency_key: keyA,
        p_items: [{ bagId: newBag.id, quantity: 1 }],
        p_voucher_code: null,
        p_pickup_time: new Date(Date.now() + 7200000).toISOString(),
        p_payment_method: 'payos_vietqr',
        p_note: 'Racer A',
        p_total_original_price: 80000,
        p_total_discount_price: 40000,
        p_discount_amount: 0,
        p_final_amount: 40000,
        p_qr_code: crypto.randomUUID(),
        p_recipient_name: 'Customer A',
        p_recipient_phone: '0977000111'
      };

      const payloadB = {
        p_id: orderIdB,
        p_store_id: defaultStoreId,
        p_idempotency_key: keyB,
        p_items: [{ bagId: newBag.id, quantity: 1 }],
        p_voucher_code: null,
        p_pickup_time: new Date(Date.now() + 7200000).toISOString(),
        p_payment_method: 'payos_vietqr',
        p_note: 'Racer B',
        p_total_original_price: 80000,
        p_total_discount_price: 40000,
        p_discount_amount: 0,
        p_final_amount: 40000,
        p_qr_code: crypto.randomUUID(),
        p_recipient_name: 'Customer B',
        p_recipient_phone: '0977000222'
      };

      // Gửi 2 request đặt hàng đồng thời trong cùng 1 mili-giây
      const [responseA, responseB] = await Promise.all([
        clientCustomerA.rpc('place_order', payloadA),
        clientCustomerB.rpc('place_order', payloadB)
      ]);

      const aSucceeded = responseA.data && !responseA.error;
      const bSucceeded = responseB.data && !responseB.error;

      // Khẳng định: Chính xác 1 request thành công, 1 request thất bại do hết hàng
      expect(aSucceeded !== bSucceeded).toBe(true);

      const failedResponse = aSucceeded ? responseB : responseA;
      expect(failedResponse.error?.message).toContain('BAG_UNAVAILABLE');

      // Khẳng định: Tồn kho cuối cùng trong DB phải là chính xác 0, không bao giờ âm
      const { data: bagInDB } = await supabaseAdmin.from('surprise_bags').select('quantity').eq('id', newBag.id).single();
      expect(bagInDB?.quantity).toBe(0);

      // Khẳng định: Chỉ duy nhất 1 đơn hàng được ghi nhận trong bảng orders
      const { data: ordersInDB } = await supabaseAdmin.from('orders').select('id').in('id', [orderIdA, orderIdB]);
      expect(ordersInDB).toHaveLength(1);
    });
  });

  // ============================================================================
  // NHÓM 4: CHỐNG TRÙNG LẶP & ĐỒNG BỘ DỮ LIỆU (IDEMPOTENCY & RESILIENCE)
  // ============================================================================
  describe('4. Kiểm định Tính Idempotency & Phòng chống tấn công SQL Injection', () => {
    it('4.1. Cùng 1 idempotency key gửi lại sẽ trả về đơn cũ (is_duplicate: true) mà không trừ kho lần 2', async () => {
      // 1. Tạo túi có tồn kho 5
      const { data: bag } = await supabaseAdmin.from('surprise_bags').insert({
        store_id: defaultStoreId,
        name: 'Túi Kiểm Thử Idempotency',
        category: 'other',
        bag_type: 'shelf_life',
        expiry_date: '2099-12-31',
        pickup_start: '00:00:00',
        pickup_end: '23:59:59',
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        original_price: 50000,
        discount_price: 25000,
        quantity: 5,
        is_available: true,
        status: 'active'
      }).select().single();

      createdBagIds.push(bag.id);

      const testOrderId = crypto.randomUUID();
      const idempKey = `idemp_audit_test_${timestamp}_${Math.random()}`;
      createdOrderIds.push(testOrderId);
      createdIdempotencyKeys.push(idempKey);

      const orderPayload = {
        p_id: testOrderId,
        p_store_id: defaultStoreId,
        p_idempotency_key: idempKey,
        p_items: [{ bagId: bag.id, quantity: 2 }],
        p_voucher_code: null,
        p_pickup_time: new Date(Date.now() + 7200000).toISOString(),
        p_payment_method: 'payos_vietqr',
        p_note: 'Đơn test idempotency',
        p_total_original_price: 100000,
        p_total_discount_price: 50000,
        p_discount_amount: 0,
        p_final_amount: 50000,
        p_qr_code: crypto.randomUUID(),
        p_recipient_name: 'Customer A',
        p_recipient_phone: '0977000111'
      };

      // Gửi lần 1 -> Thành công (is_duplicate: false)
      const res1 = await clientCustomerA.rpc('place_order', orderPayload);
      expect(res1.error).toBeNull();
      expect(res1.data?.success).toBe(true);
      expect(res1.data?.is_duplicate).toBe(false);

      // Tồn kho phải còn 3 (5 - 2)
      const { data: bagAfter1 } = await supabaseAdmin.from('surprise_bags').select('quantity').eq('id', bag.id).single();
      expect(bagAfter1?.quantity).toBe(3);

      // Gửi lần 2 với cùng key -> Trả về đơn cũ, is_duplicate: true
      const res2 = await clientCustomerA.rpc('place_order', orderPayload);
      expect(res2.error).toBeNull();
      expect(res2.data?.success).toBe(true);
      expect(res2.data?.is_duplicate).toBe(true);
      expect(res2.data?.order_id).toBe(testOrderId);

      // Tồn kho KHÔNG ĐƯỢC trừ lần 2 (vẫn giữ nguyên 3)
      const { data: bagAfter2 } = await supabaseAdmin.from('surprise_bags').select('quantity').eq('id', bag.id).single();
      expect(bagAfter2?.quantity).toBe(3);
    });

    it('4.2. Kháng tấn công SQL Injection trong các trường ghi chú, họ tên, mã voucher', async () => {
      const bagId = createdBagIds[createdBagIds.length - 1];
      const sqlInjectionOrderId = crypto.randomUUID();
      const injectionKey = `sqli_key_${timestamp}_${Math.random()}`;
      createdOrderIds.push(sqlInjectionOrderId);
      createdIdempotencyKeys.push(injectionKey);

      // Payload chứa các ký tự injection độc hại
      const maliciousPayload = {
        p_id: sqlInjectionOrderId,
        p_store_id: defaultStoreId,
        p_idempotency_key: injectionKey,
        p_items: [{ bagId: bagId, quantity: 1 }],
        p_voucher_code: "'; DROP TABLE orders; --",
        p_pickup_time: new Date(Date.now() + 7200000).toISOString(),
        p_payment_method: 'payos_vietqr',
        p_note: "Robert'); DROP TABLE users;-- ' OR '1'='1",
        p_total_original_price: 50000,
        p_total_discount_price: 25000,
        p_discount_amount: 0,
        p_final_amount: 25000,
        p_qr_code: crypto.randomUUID(),
        p_recipient_name: "Admin' OR 1=1 --",
        p_recipient_phone: "0977000111' OR '1'='1"
      };

      // Gọi RPC: Vì voucher không tồn tại, hàm sẽ raise 'VOUCHER_NOT_FOUND' an toàn mà không bị crash hay drop table
      const res = await clientCustomerA.rpc('place_order', maliciousPayload);
      expect(res.error).toBeDefined();
      expect(res.error?.message).toContain('VOUCHER_NOT_FOUND');

      // Khẳng định bảng users và orders vẫn nguyên vẹn 100%
      const { count: usersCount } = await supabaseAdmin.from('users').select('*', { count: 'exact', head: true });
      expect(usersCount).toBeGreaterThan(0);

      const { count: ordersCount } = await supabaseAdmin.from('orders').select('*', { count: 'exact', head: true });
      expect(ordersCount).toBeGreaterThan(0);
    });
  });
});
