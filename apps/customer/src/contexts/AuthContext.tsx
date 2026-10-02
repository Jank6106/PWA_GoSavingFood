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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(getCachedUser);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  useEffect(() => {
    // 1. Kiểm tra session từ local cache của Supabase SDK (cực nhanh, không đợi mạng)
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const meta = session.user.user_metadata || {};
        const cached = getCachedUser();
        if (!cached || cached.id !== session.user.id) {
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
      } else {
        setUser(null);
        setCachedUser(null);
      }
    });

    // 2. Refresh profile chi tiết từ DB ở background
    void customerService.getUser().then((existing) => {
      if (existing) {
        setUser(existing);
        setCachedUser(existing);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
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
