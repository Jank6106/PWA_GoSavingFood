import { useEffect, useState } from 'react';
import { DEMO_MERCHANT_USER } from '../mocks';
import {
  changePasswordService,
  completeSetupService,
  deleteMerchantAccountService,
  getCurrentMerchantSession,
  loginService,
  logoutService,
  registerMerchantService,
  setCachedMerchantUser,
} from '../services/auth.service';
import { supabase } from '../services/supabase';
import type { AuthUser, LoginCredentials, MerchantRegisterInput } from '../types';

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let isMounted = true;
    getCurrentMerchantSession()
      .then((existing) => {
        if (isMounted) {
          setUser(existing);
        }
      })
      .finally(() => {
        if (isMounted) {
          setInitializing(false);
        }
      });

    // Đăng ký lắng nghe sự kiện thay đổi phiên Supabase Auth
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setCachedMerchantUser(null);
        if (isMounted) setUser(null);
      } else if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
        // Query the profile after the SDK releases its auth event lock.
        window.setTimeout(() => {
          if (!isMounted) return;
          void getCurrentMerchantSession().then((verified) => {
            if (isMounted) setUser(verified);
          });
        }, 0);
      }
    });

    return () => {
      isMounted = false;
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

  const changePassword = async (oldPassword: string, newPassword: string): Promise<boolean> => {
    if (!user) {
      setError('Chưa đăng nhập.');
      throw new Error('Chưa đăng nhập.');
    }
    setLoading(true);
    setError(null);
    try {
      await changePasswordService(user.id, oldPassword, newPassword);
      return true;
    } catch (reason) {
      const msg = reason instanceof Error ? reason.message : 'Không thể đổi mật khẩu.';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const completeSetup = async (storeData?: { name?: string }) => {
    if (!user) return;
    setLoading(true);
    try {
      await completeSetupService(user.id, storeData);
      setUser((current) =>
        current
          ? {
              ...current,
              displayName: storeData?.name || current.displayName,
              isFirstLogin: false,
            }
          : current
      );
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

  const deleteAccount = async () => {
    setLoading(true);
    try {
      const res = await deleteMerchantAccountService(user?.id);
      setUser(null);
      return res;
    } finally {
      setLoading(false);
    }
  };

  const exploreDemo = () => {
    setUser(DEMO_MERCHANT_USER);
  };

  return {
    user,
    loading,
    error,
    initializing,
    login,
    register,
    changePassword,
    completeSetup,
    logout,
    deleteAccount,
    exploreDemo,
    clearError: () => setError(null),
  };
}
