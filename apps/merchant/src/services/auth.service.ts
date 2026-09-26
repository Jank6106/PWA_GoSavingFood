import type { AuthUser, LoginCredentials } from '../types';
import { delay } from './utils';

const SETUP_KEY_PREFIX = 'gsf-merchant-setup-completed';

const normalizeIdentifier = (identifier: string) => identifier.trim().toLocaleLowerCase('vi-VN');

const createAccountId = (identifier: string) => {
  let hash = 2166136261;
  for (const character of identifier) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `merchant-user-${(hash >>> 0).toString(36)}`;
};

const getSetupKey = (userId: string) => `${SETUP_KEY_PREFIX}:${userId}`;
const isSetupCompleted = (userId: string) => window.localStorage.getItem(getSetupKey(userId)) === 'true';

export async function loginService(credentials: LoginCredentials): Promise<AuthUser> {
  await delay(420);
  if (!credentials.username.trim() || !credentials.password) throw new Error('Thông tin đăng nhập không hợp lệ.');
  const identifier = normalizeIdentifier(credentials.username);
  const userId = createAccountId(identifier);
  return { id: userId, storeId: 'store-gsf-01', displayName: 'GoGreen Bakery', isFirstLogin: !isSetupCompleted(userId) };
}

export async function changePasswordService(_userId: string, oldPassword: string, newPassword: string) {
  await delay();
  if (!oldPassword || newPassword.length < 6) throw new Error('Mật khẩu chưa đáp ứng yêu cầu.');
  return true;
}

export async function completeSetupService(userId: string) {
  await delay();
  window.localStorage.setItem(getSetupKey(userId), 'true');
}

export async function logoutService() { await delay(180); }
