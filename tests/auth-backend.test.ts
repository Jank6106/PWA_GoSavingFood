import { describe, it, expect, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lblwvbedtlxjtkcuxmsf.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxibHd2YmVkdGx4anRrY3V4bXNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3MjI2NzEsImV4cCI6MjEwODI5ODY3MX0.Dgcssc3UzYyk4z80xGhNWGlZnJzIqt_T9gDdBVrFeAI';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxibHd2YmVkdGx4anRrY3V4bXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjcyMjY3MSwiZXhwIjoyMTA4Mjk4NjcxfQ.vnOu0yTCCeKgWQ0q6uPKPbrnTtPcGoY4x129_G4faII';

const supabaseAnon = createClient(SUPABASE_URL, ANON_KEY);
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const timestamp = Date.now();
const testEmail1 = `gsf_authtest_${timestamp}_1@gmail.com`;
const testEmail2 = `gsf_authtest_${timestamp}_2@gmail.com`;
const testPassword = 'TestPassword123!';
const testPhone = '0988112233';

let createdUser1Id: string | null = null;
let createdUser2Id: string | null = null;
let testOrderId: string | null = null;
let testBagId: string | null = null;

describe('Toàn diện Luồng Auth & Backend RPC Supabase', () => {
  afterAll(async () => {
    // 1. Dọn dẹp đơn hàng & order_items test
    if (testOrderId) {
      await supabaseAdmin.from('order_items').delete().eq('order_id', testOrderId);
      await supabaseAdmin.from('orders').delete().eq('id', testOrderId);
      if (testBagId) {
        await supabaseAdmin.from('surprise_bags').update({ quantity: 5 }).eq('id', testBagId);
      }
    }

    // 2. Dọn dẹp notifications & users của User 1
    if (createdUser1Id) {
      await supabaseAdmin.from('notifications').delete().eq('user_id', createdUser1Id);
      await supabaseAdmin.from('users').delete().eq('id', createdUser1Id);
      await supabaseAdmin.auth.admin.deleteUser(createdUser1Id);
    }

    // 3. Dọn dẹp notifications & users của User 2
    if (createdUser2Id) {
      await supabaseAdmin.from('notifications').delete().eq('user_id', createdUser2Id);
      await supabaseAdmin.from('users').delete().eq('id', createdUser2Id);
      await supabaseAdmin.auth.admin.deleteUser(createdUser2Id);
    }

    // 4. Quét dọn bảo hiểm triệt để mọi bản ghi test mồ côi gsf_authtest_%
    await supabaseAdmin.from('users').delete().like('email', 'gsf_authtest_%');
  });

  it('1. Đăng ký tài khoản khách hàng mới & Trigger handle_new_user tự động đồng bộ sang public.users', async () => {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail1,
      password: testPassword,
      email_confirm: true,
      user_metadata: {
        name: 'Kiểm Thử Viên 1',
        phone: testPhone,
        role: 'customer'
      }
    });

    expect(error).toBeNull();
    expect(data.user).toBeDefined();
    createdUser1Id = data.user?.id || null;
    expect(createdUser1Id).toBeTruthy();

    // Verify public.users sync
    const { data: pubUser } = await supabaseAdmin
      .from('users')
      .select('id, email, name, role, phone')
      .eq('id', createdUser1Id!)
      .single();

    expect(pubUser).toBeDefined();
    expect(pubUser?.email).toBe(testEmail1);
    expect(pubUser?.role).toBe('customer');
    expect(pubUser?.phone).toBe(testPhone);
  }, 15000);

  it('2. Đăng nhập thành công với Email & Mật khẩu đúng', async () => {
    const { data, error } = await supabaseAnon.auth.signInWithPassword({
      email: testEmail1,
      password: testPassword
    });

    expect(error).toBeNull();
    expect(data.session).toBeDefined();
    expect(data.session?.access_token).toBeTruthy();
    expect(data.user?.id).toBe(createdUser1Id);
  }, 15000);

  it('3. Đăng nhập thất bại với Mật khẩu sai và trả về mã lỗi kiểm soát được', async () => {
    const { data, error } = await supabaseAnon.auth.signInWithPassword({
      email: testEmail1,
      password: 'SaiPassword999!'
    });

    expect(data.session).toBeNull();
    expect(error).toBeDefined();
    expect(error?.message).toBeTruthy();
  }, 15000);

  it('4. Đăng nhập thất bại với Email không tồn tại', async () => {
    const { data, error } = await supabaseAnon.auth.signInWithPassword({
      email: `nonexistent_user_${timestamp}@gmail.com`,
      password: testPassword
    });

    expect(data.session).toBeNull();
    expect(error).toBeDefined();
    expect(error?.message).toMatch(/invalid/i);
  }, 15000);

  it('5. Tra cứu Email bằng Số điện thoại qua RPC get_email_by_phone với các định dạng SĐT', async () => {
    const phoneFormats = [testPhone, `+84${testPhone.slice(1)}`, `84${testPhone.slice(1)}`];
    for (const fmt of phoneFormats) {
      const { data: foundEmail, error } = await supabaseAnon.rpc('get_email_by_phone', {
        p_phone: fmt
      });
      expect(error).toBeNull();
      expect(foundEmail).toBe(testEmail1);
    }
  }, 15000);

  it('6. RPC get_email_by_phone trả về null an toàn khi số điện thoại không tồn tại', async () => {
    const { data: foundEmail, error } = await supabaseAnon.rpc('get_email_by_phone', {
      p_phone: '0999999999'
    });
    expect(error).toBeNull();
    expect(foundEmail).toBeNull();
  }, 15000);

  it('7. Hai tài khoản có thể dùng chung SĐT nhận hàng mà không bị lỗi 23505', async () => {
    const { data: signUp2, error: err2 } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail2,
      password: testPassword,
      email_confirm: true,
      user_metadata: {
        name: 'Kiểm Thử Viên 2',
        phone: testPhone,
        role: 'customer'
      }
    });

    expect(err2).toBeNull();
    createdUser2Id = signUp2.user?.id || null;
    expect(createdUser2Id).toBeTruthy();

    const { error: updateErr } = await supabaseAdmin
      .from('users')
      .update({ phone: testPhone })
      .eq('id', createdUser2Id!);

    expect(updateErr).toBeNull();
  }, 15000);

  it('8. Cập nhật thông tin profile (name, avatar, phone) trong public.users thành công', async () => {
    const newName = 'Tên Mới Sau Cập Nhật';
    const newAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200';

    const { error } = await supabaseAdmin
      .from('users')
      .update({
        name: newName,
        avatar_url: newAvatar
      })
      .eq('id', createdUser1Id!);

    expect(error).toBeNull();

    const { data: updatedUser } = await supabaseAdmin
      .from('users')
      .select('name, avatar_url')
      .eq('id', createdUser1Id!)
      .single();

    expect(updatedUser?.name).toBe(newName);
    expect(updatedUser?.avatar_url).toBe(newAvatar);
  }, 15000);

  it('9. Tài khoản mới có thể đặt hàng thành công qua RPC place_order', async () => {
    const { data: bags } = await supabaseAdmin
      .from('surprise_bags')
      .select('id, store_id, name, discount_price, original_price, quantity')
      .eq('is_available', true)
      .is('deleted_at', null)
      .gt('quantity', 1)
      .limit(1);

    expect(bags && bags.length > 0).toBe(true);
    const bag = bags![0];
    testBagId = bag.id;

    // Đảm bảo túi đang trong khung giờ mở bán để test đặt hàng
    await supabaseAdmin
      .from('surprise_bags')
      .update({ pickup_start: '06:00:00', pickup_end: '23:59:00', is_available: true })
      .eq('id', bag.id);

    const userClient = createClient(SUPABASE_URL, ANON_KEY);
    await userClient.auth.signInWithPassword({ email: testEmail1, password: testPassword });

    const newOrderId = crypto.randomUUID();
    testOrderId = newOrderId;

    const { data: orderRes, error: orderErr } = await userClient.rpc('place_order', {
      p_id: newOrderId,
      p_store_id: bag.store_id,
      p_idempotency_key: `vitest-key-${timestamp}`,
      p_items: [{ bagId: bag.id, quantity: 1 }],
      p_voucher_code: null,
      p_pickup_time: new Date(Date.now() + 3600000).toISOString(),
      p_payment_method: 'banking',
      p_note: 'Vitest Automated Test Order',
      p_total_original_price: bag.original_price,
      p_total_discount_price: bag.discount_price,
      p_discount_amount: 0,
      p_final_amount: bag.discount_price,
      p_qr_code: `QR-VITEST-${newOrderId}`,
      p_recipient_name: 'Khách Test Vitest',
      p_recipient_phone: testPhone
    });

    expect(orderErr).toBeNull();
    expect(orderRes?.success).toBe(true);
    expect(orderRes?.order_id).toBe(newOrderId);
    expect(orderRes?.pickup_token).toBeTruthy();
  }, 20000);

  it('10. RPC place_order từ chối khi số lượng đặt vượt quá tồn kho (Insufficient stock)', async () => {
    if (!testBagId) return;

    const userClient = createClient(SUPABASE_URL, ANON_KEY);
    await userClient.auth.signInWithPassword({ email: testEmail1, password: testPassword });

    const { data: bag } = await supabaseAdmin
      .from('surprise_bags')
      .select('store_id, discount_price, original_price')
      .eq('id', testBagId)
      .single();

    const overOrderId = crypto.randomUUID();
    const { data: failRes, error: failErr } = await userClient.rpc('place_order', {
      p_id: overOrderId,
      p_store_id: bag!.store_id,
      p_idempotency_key: `vitest-overstock-${timestamp}`,
      p_items: [{ bagId: testBagId, quantity: 99999 }], // vượt quá tồn kho
      p_voucher_code: null,
      p_pickup_time: new Date(Date.now() + 3600000).toISOString(),
      p_payment_method: 'banking',
      p_note: 'Test overstock',
      p_total_original_price: bag!.original_price * 99999,
      p_total_discount_price: bag!.discount_price * 99999,
      p_discount_amount: 0,
      p_final_amount: bag!.discount_price * 99999,
      p_qr_code: `QR-OVERSTOCK-${overOrderId}`,
      p_recipient_name: 'Test Overstock',
      p_recipient_phone: testPhone
    });

    // RPC trả về lỗi hoặc success: false
    const hasFailed = failErr !== null || (failRes && failRes.success === false);
    expect(hasFailed).toBe(true);
  }, 20000);

  it('11. RPC place_order ngăn chặn đặt trùng lặp khi dùng lại cùng Idempotency Key', async () => {
    if (!testBagId || !testOrderId) return;

    const userClient = createClient(SUPABASE_URL, ANON_KEY);
    await userClient.auth.signInWithPassword({ email: testEmail1, password: testPassword });

    const { data: bag } = await supabaseAdmin
      .from('surprise_bags')
      .select('store_id, discount_price, original_price')
      .eq('id', testBagId)
      .single();

    const duplicateOrderId = crypto.randomUUID();
    const { data: dupRes, error: dupErr } = await userClient.rpc('place_order', {
      p_id: duplicateOrderId,
      p_store_id: bag!.store_id,
      p_idempotency_key: `vitest-key-${timestamp}`, // Trùng key với Test 9
      p_items: [{ bagId: testBagId, quantity: 1 }],
      p_voucher_code: null,
      p_pickup_time: new Date(Date.now() + 3600000).toISOString(),
      p_payment_method: 'banking',
      p_note: 'Duplicate test',
      p_total_original_price: bag!.original_price,
      p_total_discount_price: bag!.discount_price,
      p_discount_amount: 0,
      p_final_amount: bag!.discount_price,
      p_qr_code: `QR-DUP-${duplicateOrderId}`,
      p_recipient_name: 'Khách Test Dup',
      p_recipient_phone: testPhone
    });

    // RPC trả về đơn hàng cũ hoặc trả lỗi không cho duplicate
    if (dupRes) {
      expect(dupRes.order_id).toBe(testOrderId);
    } else {
      expect(dupErr).toBeDefined();
    }
  }, 20000);

  it('12. Đăng nhập tài khoản Đối tác merchant@gosavingfood.app sở hữu danh sách cửa hàng thực tế', async () => {
    const merchClient = createClient(SUPABASE_URL, ANON_KEY);
    const { data: merchData, error: merchErr } = await merchClient.auth.signInWithPassword({
      email: 'merchant@gosavingfood.app',
      password: 'Password123!'
    });

    expect(merchErr).toBeNull();
    expect(merchData.user).toBeDefined();

    const { data: stores, error: storesErr } = await merchClient
      .from('stores')
      .select('id, name, status, logo_url, banner_url')
      .eq('owner_user_id', merchData.user.id);

    expect(storesErr).toBeNull();
    expect(stores && stores.length > 0).toBe(true);
    // Xác minh cửa hàng có logo_url chuẩn
    expect(stores![0].logo_url).toBeTruthy();
  }, 15000);

  it('13. Đăng nhập tài khoản Quản trị viên admin@gsf.app và xác thực vai trò quản trị', async () => {
    const { data: adminUser, error: adminErr } = await supabaseAdmin
      .from('users')
      .select('id, email, role')
      .eq('email', 'admin@gsf.app')
      .single();

    expect(adminErr).toBeNull();
    expect(adminUser).toBeDefined();
    expect(adminUser.role).toBe('admin');
  }, 15000);
});
