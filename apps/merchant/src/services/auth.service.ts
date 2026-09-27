import type { AuthUser, LoginCredentials } from '../types';
import { supabase } from './supabase';
import { delay } from './utils';

const SETUP_KEY_PREFIX = 'gsf-merchant-setup-completed';

const normalizeIdentifier = (identifier: string) =>
  identifier.trim().toLocaleLowerCase('vi-VN');

const createAccountId = (identifier: string) => {
  let hash = 2166136261;
  for (const character of identifier) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `merchant-user-${(hash >>> 0).toString(36)}`;
};

const getSetupKey = (userId: string) => `${SETUP_KEY_PREFIX}:${userId}`;
const isSetupCompleted = (userId: string) =>
  window.localStorage.getItem(getSetupKey(userId)) === 'true';

export async function loginService(credentials: LoginCredentials): Promise<AuthUser> {
  const username = credentials.username.trim();
  const password = credentials.password;

  if (!username || !password) {
    throw new Error('Thông tin đăng nhập không hợp lệ.');
  }

  const isEmail = username.includes('@');
  const email = isEmail ? username : `${username}@merchant.gosavingfood.vn`;

  try {
    // 1. Thử đăng nhập bằng Supabase Auth
    let user = null;
    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({ email, password });

    if (!signInError && signInData.user) {
      user = signInData.user;
    } else {
      // 2. Thử đăng ký nếu chưa có tài khoản
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: username,
            role: 'merchant',
          },
        },
      });
      if (!signUpError && signUpData.user) {
        user = signUpData.user;
      }
    }

    if (user) {
      // Tìm cửa hàng của chủ quán trong bảng stores
      const { data: store } = await supabase
        .from('stores')
        .select('*')
        .eq('owner_user_id', user.id)
        .maybeSingle();

      const storeId = store?.id || 'b0000000-0000-0000-0000-000000000002';
      const storeName = store?.name || user.user_metadata?.name || 'Cửa hàng GoSavingFood';

      return {
        id: user.id,
        storeId,
        displayName: storeName,
        isFirstLogin: !store && !isSetupCompleted(user.id),
      };
    }
  } catch (err) {
    console.warn('Supabase merchant login error, using local fallback:', err);
  }

  // Fallback demo
  await delay(300);
  const identifier = normalizeIdentifier(credentials.username);
  const userId = createAccountId(identifier);
  return {
    id: userId,
    storeId: 'b0000000-0000-0000-0000-000000000002',
    displayName: 'Quán Chay Quýt',
    isFirstLogin: !isSetupCompleted(userId),
  };
}

export async function changePasswordService(
  _userId: string,
  oldPassword: string,
  newPassword: string
) {
  if (!oldPassword || newPassword.length < 6) {
    throw new Error('Mật khẩu chưa đáp ứng yêu cầu.');
  }

  try {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (!error) return true;
  } catch {
    // fallback
  }

  await delay(200);
  return true;
}

export async function completeSetupService(userId: string) {
  await delay();
  window.localStorage.setItem(getSetupKey(userId), 'true');
}

export async function logoutService() {
  try {
    await supabase.auth.signOut();
  } catch {
    // ignore
  }
  await delay(180);
}

export async function getCurrentMerchantUser(): Promise<AuthUser | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: store } = await supabase
      .from('stores')
      .select('*')
      .eq('owner_user_id', user.id)
      .maybeSingle();

    const storeId = store?.id || 'b0000000-0000-0000-0000-000000000002';
    const storeName = store?.name || user.user_metadata?.name || 'Quán Chay Quýt';

    return {
      id: user.id,
      storeId,
      displayName: storeName,
      isFirstLogin: !store && !isSetupCompleted(user.id),
    };
  } catch {
    return null;
  }
}

