import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { customerService } from '../services/customer.service';
import { supabase } from '../services/supabase';
import type { User } from '../shared/types/customer.types';
import { AuthContext } from './auth-context';
import type { AuthContextValue } from './auth-context';

const USER_CACHE_KEY = 'gsf_cached_auth_user';

function getCachedUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setCachedUser(u: User | null): void {
  try {
    if (u) {
      localStorage.setItem(USER_CACHE_KEY, JSON.stringify(u));
    } else {
      localStorage.removeItem(USER_CACHE_KEY);
    }
  } catch {}
}

function cleanAuthUrl() {
  if (typeof window === 'undefined') return;
  try {
    const url = new URL(window.location.href);
    const hasAuthParams =
      url.searchParams.has('code') ||
      url.searchParams.has('error') ||
      url.searchParams.has('error_description') ||
      url.searchParams.has('error_code');
    const hasAuthHash =
      url.hash.includes('access_token') ||
      url.hash.includes('error') ||
      url.hash.includes('refresh_token');

    if (hasAuthParams || hasAuthHash) {
      url.searchParams.delete('code');
      url.searchParams.delete('error');
      url.searchParams.delete('error_description');
      url.searchParams.delete('error_code');
      url.hash = '';
      const cleanPath = url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : '');
      window.history.replaceState({}, '', cleanPath);
    }
  } catch {}
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(getCachedUser);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const code = searchParams.get('code');
        const error = searchParams.get('error') || searchParams.get('error_description');

        if (error) {
          console.warn('[auth] OAuth error from provider:', error);
          cleanAuthUrl();
        }

        // 1. Supabase client với detectSessionInUrl: true tự động hoàn thành PKCE exchange khi getSession() được gọi
        let { data: { session } } = await supabase.auth.getSession();

        // 2. Nếu getSession() chưa có session mà URL vẫn còn code, thực hiện fallback exchange
        if (!session && code) {
          try {
            const { data: exchangeData, error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
            if (!exchangeErr && exchangeData?.session) {
              session = exchangeData.session;
            }
          } catch (exchangeErr) {
            console.warn('[auth] Fallback PKCE exchange warning:', exchangeErr);
          }
        }

        // 3. Làm sạch URL sau khi đã hoàn tất xử lý xác thực
        cleanAuthUrl();

        if (!isMounted) return;

        if (session?.user) {
          const meta = session.user.user_metadata || {};
          const quickUser: User = {
            id: session.user.id,
            name:
              meta.full_name ||
              meta.name ||
              session.user.email?.split('@')[0] ||
              'Khách hàng',
            phone: meta.phone || '',
            email: session.user.email,
            avatar: meta.avatar_url || meta.picture || meta.avatar,
          };
          setUser(quickUser);
          setCachedUser(quickUser);

          // Refresh profile chi tiết từ DB ở background
          void customerService.getUser().then((existing) => {
            if (existing && isMounted) {
              setUser(existing);
              setCachedUser(existing);
            }
          });
        } else {
          setUser(null);
          setCachedUser(null);
        }
      } catch (err) {
        console.warn('[auth] Lỗi khởi tạo session:', err);
      }
    };

    void initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        cleanAuthUrl();
        const fullUser = await customerService.getUser();
        if (fullUser) {
          setUser(fullUser);
          setCachedUser(fullUser);
        } else {
          const meta = session.user.user_metadata || {};
          const quickUser: User = {
            id: session.user.id,
            name:
              meta.full_name ||
              meta.name ||
              session.user.email?.split('@')[0] ||
              'Khách hàng',
            phone: meta.phone || '',
            email: session.user.email,
            avatar: meta.avatar_url || meta.picture || meta.avatar,
          };
          setUser(quickUser);
          setCachedUser(quickUser);
        }
      } else if (_event === 'SIGNED_OUT') {
        setUser(null);
        setCachedUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isAuthOpen,
      showAuthModal: () => setIsAuthOpen(true),
      hideAuthModal: () => setIsAuthOpen(false),
      login: async (identifier, password) => {
        const nextUser = await customerService.login(identifier, password);
        setUser(nextUser);
        setCachedUser(nextUser);
        setIsAuthOpen(false);
      },
      loginWithGoogle: async () => {
        await customerService.loginWithGoogle();
      },
      register: async (name: string, identifier: string, password?: string) => {
        await customerService.registerInit(name, identifier, password);
      },
      registerInit: async (name: string, email: string, password?: string, phone?: string) => {
        const res = await customerService.registerInit(name, email, password, phone);
        if (res.autoConfirmed && res.user) {
          setUser(res.user);
          setCachedUser(res.user);
        }
        return res;
      },
      verifyRegisterOtp: async (email: string, token: string) => {
        const nextUser = await customerService.verifyRegisterOtp(email, token);
        setUser(nextUser);
        setCachedUser(nextUser);
        setIsAuthOpen(false);
      },
      resendRegisterOtp: async (email: string) => {
        await customerService.resendRegisterOtp(email);
      },
      resetPassword: async (email: string) => {
        return await customerService.resetPassword(email);
      },
      logout: () => {
        void customerService.logout();
        setUser(null);
        setCachedUser(null);
      },
      deleteAccount: async () => {
        const targetId = user?.id;
        const targetEmail = user?.email;
        const targetPhone = user?.phone;
        const res = await customerService.deleteAccount(targetId, targetEmail || targetPhone);
        setUser(null);
        setCachedUser(null);
        return res;
      },
      updateProfile: (updates: Partial<User>) => {
        setUser((prev) => {
          const updated = prev ? { ...prev, ...updates } : null;
          setCachedUser(updated);
          return updated;
        });
      },
    }),
    [isAuthOpen, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
