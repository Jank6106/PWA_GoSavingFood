import { useEffect, useState } from 'react';
import { DEMO_MERCHANT_USER } from '../mocks';
import {
  changePasswordService,
  completeSetupService,
  getCachedMerchantUser,
  getCurrentMerchantSession,
  loginService,
  logoutService,
  registerMerchantService,
  setCachedMerchantUser,
} from '../services/auth.service';
import { supabase } from '../services/supabase';
import type { AuthUser, LoginCredentials, MerchantRegisterInput } from '../types';

export function useAuth() {
  // Tối ưu như Customer PWA: Render dữ liệu ảo tức thì 0ms, sau đó load phiên thật ngầm
  const [user, setUser] = useState<AuthUser | null>(() => getCachedMerchantUser() || DEMO_MERCHANT_USER);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Xác thực ngầm với getSession() siêu tốc không gây gián đoạn
    getCurrentMerchantSession().then((existing) => {
      if (existing) {
        setUser(existing);
      }
    });

    // 2. Đăng ký lắng nghe sự kiện thay đổi phiên Supabase Auth
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setCachedMerchantUser(null);
        setUser(null);
      } else if (event === 'SIGNED_IN' && session?.user) {
        const verified = await getCurrentMerchantSession();
        if (verified) {
          setUser(verified);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (credentials: LoginCredentials) => {
    setLoading(true);
    setError(null);
    try {
      const nextUser = await loginService(credentials);
      setUser(nextUser);
      return nextUser;
    } catch (reason) {
      const msg = reason instanceof Error ? reason.message : 'Không thể đăng nhập.';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const register = async (input: MerchantRegisterInput) => {
    setLoading(true);
    setError(null);
    try {
      const nextUser = await registerMerchantService(input);
      setUser(nextUser);
      return nextUser;
    } catch (reason) {
      const msg = reason instanceof Error ? reason.message : 'Không thể đăng ký đối tác.';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async (oldPassword: string, newPassword: string) => {
    if (!user) return false;
    setLoading(true);
    setError(null);
    try {
      return await changePasswordService(user.id, oldPassword, newPassword);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể đổi mật khẩu.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const completeSetup = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await completeSetupService(user.id);
      setUser((current) => (current ? { ...current, isFirstLogin: false } : current));
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    await logoutService();
    setUser(null);
    setLoading(false);
  };

  const exploreDemo = () => {
    setUser(DEMO_MERCHANT_USER);
  };

  return {
    user,
    loading,
    error,
    login,
    register,
    changePassword,
    completeSetup,
    logout,
    exploreDemo,
    clearError: () => setError(null),
  };
}
