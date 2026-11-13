import type { AuthUser, LoginCredentials, MerchantRegisterInput } from '../types';
import {
  isValidEmail,
  mapSupabaseAuthError,
  parseIdentifier,
} from '../utils/validation';
import { supabase } from './supabase';
import { delay, optimizeImageUrl } from './utils';

const SETUP_KEY_PREFIX = 'gsf-merchant-setup-completed';
export const MERCHANT_CACHE_KEY = 'gsf_merchant_cached_user';

async function requireMerchantRole(userId: string): Promise<void> {
  const { data, error } = await supabase.from('users').select('role').eq('id', userId).maybeSingle();
  if (error || data?.role !== 'merchant') {
    setCachedMerchantUser(null);
    throw new Error('Tài khoản này không có quyền quản lý cửa hàng.');
  }
}

const getSetupKey = (userId: string) => `${SETUP_KEY_PREFIX}:${userId}`;
export const isSetupCompleted = (userId: string) =>
  typeof window !== 'undefined' && window.localStorage.getItem(getSetupKey(userId)) === 'true';

export const markSetupCompletedLocally = (userId: string) => {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(getSetupKey(userId), 'true');
    } catch {}
  }
};

/**
 * Đọc session user được cache trong localStorage (0ms sync render)
 */
export function getCachedMerchantUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(MERCHANT_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.id === 'string' && typeof parsed.storeId === 'string') {
      return parsed as AuthUser;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Ghi hoặc xóa cache merchant user
 */
export function setCachedMerchantUser(user: AuthUser | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (user) {
      window.localStorage.setItem(MERCHANT_CACHE_KEY, JSON.stringify(user));
    } else {
      window.localStorage.removeItem(MERCHANT_CACHE_KEY);
    }
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Kiểm tra tính đầy đủ của hồ sơ cửa hàng theo yêu cầu nghiệp vụ:
 * 1. Cờ is_first_login trong user metadata hoặc stores DB
 * 2. Tính đầy đủ của thông tin cửa hàng thực tế (Tên, SĐT, Địa chỉ, Tọa độ GPS)
 */
export function isStoreProfileComplete(store: any, user?: any): boolean {
  if (!store) return false;

  // Cờ thiết lập lần đầu trong user metadata nếu được chỉ định rõ là true -> chưa hoàn thiện
  if (user?.user_metadata?.is_first_login === true) return false;

  // Cờ trong DB stores nếu được chỉ định rõ là true -> chưa hoàn thiện
  if (store.is_first_login === true) return false;

  // Nếu user metadata đã ghi nhận is_first_login === false VÀ cửa hàng có tên -> coi như hoàn tất vĩnh viễn
  if (user?.user_metadata?.is_first_login === false && store.name && store.name.trim().length > 0) {
    if (user?.id) markSetupCompletedLocally(user.id);
    return true;
  }

  // Nếu đã lưu cờ hoàn tất trong localStorage của trình duyệt này
  if (user?.id && isSetupCompleted(user.id) && store.name && store.name.trim().length > 0) {
    return true;
  }

  const hasName = Boolean(
    store.name &&
    store.name.trim().length > 0 &&
    store.name.trim() !== 'Cửa hàng' &&
    store.name.trim() !== 'Cửa hàng mới' &&
    store.name.trim() !== 'Tiệm Bánh & Món Ngon' &&
    store.name.trim() !== 'Quán Của Tôi'
  );

  const hasPhone = Boolean(store.phone && store.phone.trim().length >= 8);
  const hasAddress = Boolean(store.address && store.address.trim().length >= 5);
  const hasCoordinates = Boolean(
    store.latitude !== null &&
    store.latitude !== undefined &&
    Number(store.latitude) !== 0 &&
    !isNaN(Number(store.latitude))
  );

  const isComplete = Boolean(hasName && hasPhone && hasAddress && hasCoordinates);
  if (isComplete && user?.id) {
    markSetupCompletedLocally(user.id);
  }
  return isComplete;
}

export async function ensureUserStore(
  user: any,
  defaultName: string,
  extra?: { address?: string; phone?: string; category?: string; latitude?: number; longitude?: number }
) {
  try {
    const { data: stores } = await supabase
      .from('stores')
      .select('id, name, owner_user_id, phone, address, latitude, longitude, description')
      .eq('owner_user_id', user.id)
      .limit(1);

    let store = stores?.[0] || null;

    if (!store) {
      const storeName =
        user.user_metadata?.store_name || user.user_metadata?.name || defaultName || 'Cửa hàng mới';
      const storePhone = extra?.phone || user.user_metadata?.phone || '0900000000';
      const storeAddress = extra?.address || user.user_metadata?.address || 'Hà Nội';
      const storeCategory = extra?.category || 'bakery';
      const storeLat = extra?.latitude ?? 21.0285;
      const storeLng = extra?.longitude ?? 105.8542;

      // Thử tạo qua RPC create_store trước (SECURITY DEFINER)
      const { data: newStores } = await supabase.rpc('create_store', {
        p_owner_user_id: user.id,
        p_name: storeName,
        p_description: 'Cửa hàng đối tác giảm lãng phí thực phẩm cùng GoSavingFood',
        p_phone: storePhone,
        p_address: storeAddress,
        p_latitude: storeLat,
        p_longitude: storeLng,
        p_logo_url: optimizeImageUrl('https://images.unsplash.com/photo-1555396273-367ea4eb4db5', 200, 75),
        p_banner_url: optimizeImageUrl('https://images.unsplash.com/photo-1504674900247-0877df9cc836', 800, 75),
        p_food_categories: [storeCategory],
        p_open_time: '07:00:00',
        p_close_time: '21:00:00',
        p_is_open: true,
      });

      if (newStores && newStores.length > 0) {
        store = newStores[0];
      } else {
        // Fallback chèn trực tiếp vào bảng stores
        const { data: insertedStore } = await supabase
          .from('stores')
          .insert({
            owner_user_id: user.id,
            name: storeName,
            description: 'Cửa hàng đối tác giảm lãng phí thực phẩm cùng GoSavingFood',
            phone: storePhone,
            address: storeAddress,
            latitude: storeLat,
            longitude: storeLng,
            logo_url: optimizeImageUrl('https://images.unsplash.com/photo-1555396273-367ea4eb4db5', 200, 75),
            banner_url: optimizeImageUrl('https://images.unsplash.com/photo-1504674900247-0877df9cc836', 800, 75),
            food_categories: [storeCategory],
            open_time: '07:00:00',
            close_time: '21:00:00',
            is_open: true,
          })
          .select()
          .maybeSingle();

        if (insertedStore) {
          store = insertedStore;
        }
      }
    }
    return store;
  } catch (err) {
    console.warn('Lỗi kiểm tra/tạo store cho user:', err);
    return null;
  }
}

/**
 * Đăng nhập Merchant hỗ trợ cả Email lẫn Số điện thoại Việt Nam
 */
export async function loginService(credentials: LoginCredentials): Promise<AuthUser> {
  const username = credentials.username.trim();
  const rawPassword = credentials.password;

  if (!username || !rawPassword) {
    throw new Error('Vui lòng nhập đầy đủ thông tin đăng nhập.');
  }

  let email = '';
  const parsed = parseIdentifier(username);

  if (parsed.type === 'email') {
    email = parsed.normalized;
  } else if (parsed.type === 'phone') {
    email = parsed.syntheticEmail!;
    try {
      const { data: realEmail } = await supabase.rpc('get_email_by_phone', {
        p_phone: parsed.phoneNational || parsed.raw,
      });
      if (realEmail) {
        email = realEmail;
      }
    } catch {
      // Fallback sang synthetic email
    }
  } else {
    // Cho phép nhập username thông thường (như merchant, admin, tiệm bánh)
    email = username.includes('@') ? username : `${username.toLowerCase()}@gosavingfood.vn`;
  }

  let user = null;
  let lastError: any = null;

  // Xác thực chính xác 1:1 bằng Supabase Auth với email và mật khẩu do người dùng cung cấp
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: rawPassword,
  });

  if (!signInError && signInData.user) {
    user = signInData.user;
  } else {
    lastError = signInError;

    // Nếu đăng nhập bằng SĐT và tìm kiếm email thật thất bại, thử bằng synthetic email (nếu có)
    if (parsed.type === 'phone' && parsed.syntheticEmail && parsed.syntheticEmail !== email) {
      const { data: fallbackData, error: fallbackError } = await supabase.auth.signInWithPassword({
        email: parsed.syntheticEmail,
        password: rawPassword,
      });

      if (!fallbackError && fallbackData.user) {
        user = fallbackData.user;
      }
    }
  }

  if (user) {
    await requireMerchantRole(user.id);
    const store = await ensureUserStore(user, username);
    const isComplete = isStoreProfileComplete(store, user);
    const storeId = store?.id || 'b0000000-0000-0000-0000-000000000002';
    const storeName = store?.name || user.user_metadata?.store_name || user.user_metadata?.name || username;

    const authUser: AuthUser = {
      id: user.id,
      storeId,
      displayName: storeName,
      isFirstLogin: !isComplete,
    };

    setCachedMerchantUser(authUser);

    // Yêu cầu quyền lưu trữ bền vững trên PWA trình duyệt
    if (typeof window !== 'undefined' && 'storage' in navigator && (navigator.storage as any)?.persist) {
      (navigator.storage as any).persist().catch(() => {});
    }

    return authUser;
  }

  throw new Error(mapSupabaseAuthError(lastError));
}

/**
 * Đăng ký tài khoản Đối tác / Cửa hàng mới
 */
export async function registerMerchantService(data: MerchantRegisterInput): Promise<AuthUser> {
  const trimmedName = data.name.trim();
  const trimmedStoreName = data.storeName.trim();
  const trimmedEmail = data.email.trim().toLowerCase();
  const trimmedAddress = data.address?.trim() || '';

  if (!trimmedName || trimmedName.length < 2) {
    throw new Error('Họ và tên người đại diện phải có ít nhất 2 ký tự.');
  }

  if (!trimmedStoreName || trimmedStoreName.length < 2) {
    throw new Error('Tên cửa hàng phải có ít nhất 2 ký tự.');
  }

  if (!isValidEmail(trimmedEmail)) {
    throw new Error('Địa chỉ email không đúng định dạng (ví dụ: cuahang@gmail.com).');
  }

  const parsedPhone = parseIdentifier(data.phone);
  if (parsedPhone.type !== 'phone') {
    throw new Error(parsedPhone.errorMessage || 'Số điện thoại không đúng định dạng di động Việt Nam.');
  }

  const pwd = data.password;
  if (!pwd || pwd.length < 6) {
    throw new Error('Mật khẩu phải có ít nhất 6 ký tự.');
  }

  // 1. Tạo tài khoản trong Supabase Auth
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: trimmedEmail,
    password: pwd,
    options: {
      data: {
        name: trimmedName,
        full_name: trimmedName,
        store_name: trimmedStoreName,
        phone: parsedPhone.phoneNational,
        phone_e164: parsedPhone.phoneE164,
        role: 'merchant',
        address: trimmedAddress,
      },
    },
  });

  if (signUpError) {
    throw new Error(mapSupabaseAuthError(signUpError));
  }

  if (signUpData.user && Array.isArray(signUpData.user.identities) && signUpData.user.identities.length === 0) {
    throw new Error('Email này đã được đăng ký trên hệ thống. Vui lòng chuyển sang tab Đăng nhập.');
  }

  const createdUser = signUpData.user;
  if (!createdUser) {
    throw new Error('Đăng ký không thành công. Vui lòng thử lại.');
  }

  // 2. Tự động đồng bộ vào bảng users và tạo store mới cho đối tác
  try {
    await supabase.from('users').upsert(
      {
        id: createdUser.id,
        email: trimmedEmail,
        name: trimmedName,
        phone: parsedPhone.phoneNational,
        role: 'merchant',
      },
      { onConflict: 'id' }
    );
  } catch {
    // Ignore if handled by DB triggers
  }

  const store = await ensureUserStore(createdUser, trimmedStoreName, {
    address: trimmedAddress,
    phone: parsedPhone.phoneNational,
    category: data.category || 'bakery',
  });

  const storeId = store?.id || 'b0000000-0000-0000-0000-000000000002';

  const authUser: AuthUser = {
    id: createdUser.id,
    storeId,
    displayName: trimmedStoreName,
    isFirstLogin: false,
  };

  setCachedMerchantUser(authUser);
  return authUser;
}

export async function changePasswordService(
  _userId: string,
  oldPassword: string,
  newPassword: string
) {
  if (!oldPassword) {
    throw new Error('Vui lòng nhập mật khẩu hiện tại.');
  }

  if (newPassword.length < 6) {
    throw new Error('Mật khẩu mới phải có ít nhất 6 ký tự.');
  }

  if (oldPassword !== 'initial' && oldPassword === newPassword) {
    throw new Error('Mật khẩu mới không được trùng với mật khẩu hiện tại.');
  }

  // 1. Kiểm tra session hiện tại trong Supabase
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  let userEmail = session?.user?.email;
  if (!userEmail) {
    const { data: userData } = await supabase.auth.getUser();
    userEmail = userData?.user?.email;
  }

  if (userEmail) {
    let verifiedPassword = oldPassword;

    // Nếu không phải là bước setup ban đầu, tiến hành xác thực mật khẩu hiện tại
    if (oldPassword !== 'initial') {
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: oldPassword,
      });

      if (signInErr) {
        throw new Error(mapSupabaseAuthError(signInErr) || 'Mật khẩu hiện tại không chính xác.');
      }
      verifiedPassword = oldPassword;
    }

    // 2. Cập nhật mật khẩu mới trên Supabase Auth (kèm current_password khi có yêu cầu bảo mật)
    let updateError = null;

    if (oldPassword !== 'initial') {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
        current_password: verifiedPassword,
      });
      updateError = error;
    } else {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      updateError = error;
    }

    if (updateError) {
      throw new Error(mapSupabaseAuthError(updateError));
    }

    return true;
  }

  // Fallback: nếu đang chạy mock hoặc demo user không có Supabase session
  const cached = getCachedMerchantUser();
  if (cached) {
    if (oldPassword !== 'initial') {
      const validDemoPasswords = ['Password123!', '123456', '12345600Aa!'];
      if (!validDemoPasswords.includes(oldPassword)) {
        throw new Error('Mật khẩu hiện tại không chính xác.');
      }
    }
    await delay(200);
    return true;
  }

  if (sessionError) {
    throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
  }

  throw new Error('Không thể xác thực phiên làm việc. Vui lòng đăng nhập lại.');
}

export async function completeSetupService(userId: string, storeData?: { name?: string }) {
  await delay(100);
  if (typeof window !== 'undefined') {
    markSetupCompletedLocally(userId);
    const cached = getCachedMerchantUser();
    if (cached && cached.id === userId) {
      setCachedMerchantUser({
        ...cached,
        displayName: storeData?.name || cached.displayName,
        isFirstLogin: false,
      });
    }
  }

  // 1. Đánh dấu cờ is_first_login = false trong Supabase Auth metadata
  try {
    const { data: updateData, error: updateError } = await supabase.auth.updateUser({
      data: {
        is_first_login: false,
        setup_completed_at: new Date().toISOString(),
        ...(storeData?.name ? { store_name: storeData.name } : {}),
      },
    });

    if (!updateError && updateData?.user) {
      const cached = getCachedMerchantUser();
      if (cached) {
        setCachedMerchantUser({
          ...cached,
          displayName: storeData?.name || cached.displayName,
          isFirstLogin: false,
        });
      }
    }
  } catch (err) {
    console.warn('[auth.service] completeSetupService metadata update:', err);
  }

  // 2. Yêu cầu quyền lưu trữ bền vững trên PWA trình duyệt
  if (typeof window !== 'undefined' && 'storage' in navigator && (navigator.storage as any)?.persist) {
    (navigator.storage as any).persist().catch(() => {});
  }
}

export async function logoutService() {
  setCachedMerchantUser(null);
  try {
    await supabase.auth.signOut();
  } catch {
    // ignore
  }
  await delay(100);
}

/**
 * Tối ưu Supabase Session Cache (Giải pháp 2):
 * Đọc nhanh từ `getSession()` (đã có sẵn trong bộ nhớ client / localStorage của Supabase)
 * thay vì chờ network `getUser()`, giúp render UI ngay lập tức trong 0ms.
 */
export async function getCurrentMerchantSession(): Promise<AuthUser | null> {
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session?.user) {
      setCachedMerchantUser(null);
      return null;
    }

    const user = session.user;
    await requireMerchantRole(user.id);
    const cached = getCachedMerchantUser();

    // Nếu đã có cache trùng ID:
    if (cached && cached.id === user.id) {
      // Nếu user metadata đã cập nhật is_first_login = false nhưng cached vẫn mang true, sửa ngay
      if (user.user_metadata?.is_first_login === false && cached.isFirstLogin) {
        const updated = { ...cached, isFirstLogin: false };
        setCachedMerchantUser(updated);
        return updated;
      }
      return cached;
    }

    // Nếu chưa có store trong cache, kiểm tra/tạo
    const store = await ensureUserStore(user, 'Quán Của Tôi');
    const isComplete = isStoreProfileComplete(store, user);
    const storeId = store?.id || 'b0000000-0000-0000-0000-000000000002';
    const storeName = store?.name || user.user_metadata?.store_name || user.user_metadata?.name || 'Cửa hàng của tôi';

    const authUser: AuthUser = {
      id: user.id,
      storeId,
      displayName: storeName,
      isFirstLogin: !isComplete,
    };

    setCachedMerchantUser(authUser);
    return authUser;
  } catch {
    setCachedMerchantUser(null);
    return null;
  }
}

export const getCurrentMerchantUser = getCurrentMerchantSession;

export async function deleteMerchantAccountService(
  userId?: string,
  identifier?: string
): Promise<{ success: boolean; message: string }> {
  try {
    let res = await supabase.rpc('delete_user_account', userId ? { p_user_id: userId } : {});
    let result = res.data as { success?: boolean; error?: string; message?: string } | null;

    if ((!result || !result.success) && identifier) {
      const idRes = await supabase.rpc('delete_user_by_identifier', { p_identifier: identifier });
      if (idRes.data && (idRes.data as any).success) {
        result = idRes.data as any;
      }
    }

    try {
      await supabase.auth.signOut();
    } catch {}

    setCachedMerchantUser(null);
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(MERCHANT_CACHE_KEY);
      } catch {}
    }

    return {
      success: result?.success ?? true,
      message: result?.message || 'Tài khoản đối tác đã được xóa vĩnh viễn khỏi hệ thống.',
    };
  } catch (err: any) {
    console.warn('Lỗi khi xóa tài khoản merchant:', err);
    try {
      await supabase.auth.signOut();
    } catch {}
    setCachedMerchantUser(null);
    return { success: false, message: err?.message || 'Không thể xóa tài khoản. Vui lòng thử lại.' };
  }
}
