import { getCachedCustomerUser, setCachedCustomerUser, isCustomerProfileComplete, requestPersistentStorage } from './auth-cache';
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { customerService } from '../services/customer.service';
import { supabase } from '../services/supabase';
import type { User } from '../shared/types/customer.types';
import { AuthContext } from './auth-context';
import type { AuthContextValue } from './auth-context';

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
  } catch  { /* Best-effort browser persistence/cleanup; unavailable storage must not block the UI. */ }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // 1. Khởi tạo tức thì 0ms từ cache localStorage (tránh giật/nháy màn hình chưa đăng nhập)
  const [user, setUser] = useState<User | null>(() => getCachedCustomerUser());
  // Khởi tạo cờ initializing thông minh: nếu đã có user trong cache thì false ngay từ đầu
  const [initializing, setInitializing] = useState(() => !getCachedCustomerUser());
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const needsProfileCompletion = Boolean(user && !isCustomerProfileComplete(user));

  // Tự động mở modal bổ sung thông tin nếu tài khoản đăng nhập chưa có SĐT / Họ tên
  const [completionInputs, setCompletionInputs] = useState<readonly unknown[] | null>(null);
  // Prop-backed drafts are reset before stale values can be committed.
  if (completionInputs === null || [initializing, user].some((value, index) => !Object.is(value, completionInputs[index]))) {
    setCompletionInputs([initializing, user]);

    if (!initializing && user && !isCustomerProfileComplete(user)) {
      setIsAuthOpen(true);
    }

  }

  useEffect(() => {
    let isMounted = true;

    // Yêu cầu quyền lưu trữ bền vững (PWA Persistent Storage) tránh bị iOS Safari/Chrome dọn cache
    requestPersistentStorage();

    const initAuth = async () => {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const code = searchParams.get('code');
        const error = searchParams.get('error') || searchParams.get('error_description');

        if (error) {
          console.warn('[auth] OAuth error from provider:', error);
          cleanAuthUrl();
        }

        // 1. Supabase client với detectSessionInUrl: true tự động xử lý PKCE exchange khi getSession() được gọi
        let { data: { session } } = await supabase.auth.getSession();

        // 2. Fallback exchange nếu getSession() chưa có session mà URL vẫn còn code
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

        cleanAuthUrl();

        if (!isMounted) return;

        if (session?.user) {
          const meta = session.user.user_metadata || {};
          const metaName =
            meta.custom_name ||
            meta.full_name ||
            meta.name ||
            session.user.email?.split('@')[0] ||
            'Khách hàng';

          const cached = getCachedCustomerUser();
          const effectiveName =
            cached?.id === session.user.id && cached.name ? cached.name : metaName;
          const effectivePhone =
            cached?.id === session.user.id && cached.phone !== undefined
              ? cached.phone
              : meta.phone || '';

          const quickUser: User = {
            id: session.user.id,
            name: effectiveName,
            phone: effectivePhone,
            email: session.user.email,
            avatar: cached?.avatar || meta.avatar_url || meta.picture || meta.avatar,
          };

          // Giữ lại custom user hiện có trong state/cache
          setUser((prev) => (prev ? { ...quickUser, ...prev } : quickUser));
          setCachedCustomerUser(quickUser);

          // Cập nhật background profile chi tiết từ DB (chính xác nhất) mà không làm giật UI
          void customerService.getUser().then((existing) => {
            if (existing && isMounted) {
              setUser(existing);
              setCachedCustomerUser(existing);
            }
          });
        } else {
          // Khi không có session trong Supabase, dọn dẹp cache
          setUser(null);
          setCachedCustomerUser(null);
        }
      } catch (err) {
        console.warn('[auth] Lỗi khởi tạo session:', err);
      } finally {
        if (isMounted) {
          setInitializing(false);
        }
      }
    };

    void initAuth();

    // 3. Đồng bộ vòng đời phiên: Lắng nghe SIGNED_IN, TOKEN_REFRESHED, SIGNED_OUT
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setCachedCustomerUser(null);
        if (isMounted) setUser(null);
      } else if (
        (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') &&
        session?.user
      ) {
        cleanAuthUrl();
        requestPersistentStorage();

        const meta = session.user.user_metadata || {};
        const metaName =
          meta.custom_name ||
          meta.full_name ||
          meta.name ||
          session.user.email?.split('@')[0] ||
          'Khách hàng';

        if (isMounted) {
          setUser((prev) => {
            const currentName =
              prev && prev.id === session.user.id && prev.name ? prev.name : metaName;
            const currentPhone =
              prev && prev.id === session.user.id && prev.phone !== undefined
                ? prev.phone
                : meta.phone || '';
            const next: User = {
              id: session.user.id,
              name: currentName,
              phone: currentPhone,
              email: session.user.email,
              avatar: prev?.avatar || meta.avatar_url || meta.picture || meta.avatar,
            };
            setCachedCustomerUser(next);
            return next;
          });
        }

        // Cập nhật profile đầy đủ từ DB ở background
        try {
          const fullUser = await customerService.getUser();
          if (fullUser && isMounted) {
            setUser(fullUser);
            setCachedCustomerUser(fullUser);
          }
        } catch  { /* Best-effort browser persistence/cleanup; unavailable storage must not block the UI. */ }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      initializing,
      isAuthOpen,
      needsProfileCompletion,
      showAuthModal: () => setIsAuthOpen(true),
      hideAuthModal: () => {
        // Nếu tài khoản còn thiếu thông tin bắt buộc thì không cho tắt modal ra ngoài
        if (needsProfileCompletion) return;
        setIsAuthOpen(false);
      },
      loginWithGoogle: async () => {
        await customerService.loginWithGoogle();
      },
      completeProfile: async ({ name, phone }: { name: string; phone: string }) => {
        if (!user) throw new Error('Chưa đăng nhập.');
        const targetId = user.id;
        const cleanedName = name.trim();
        const cleanedPhone = phone.replace(/\D/g, '');

        // 1. Cập nhật optimistic ngay lập tức vào state & cache
        const updatedUser: User = {
          ...user,
          name: cleanedName,
          phone: cleanedPhone,
        };
        setUser(updatedUser);
        setCachedCustomerUser(updatedUser);
        requestPersistentStorage();

        // 2. Cập nhật đồng bộ vào database và Supabase metadata
        await customerService.updateUserProfile(targetId, {
          name: cleanedName,
          phone: cleanedPhone,
        });

        setIsAuthOpen(false);
      },
      login: async (identifier, password) => {
        const nextUser = await customerService.login(identifier, password);
        setUser(nextUser);
        setCachedCustomerUser(nextUser);
        requestPersistentStorage();
        setIsAuthOpen(false);
      },
      registerInit: async (name: string, email: string, password?: string, phone?: string) => {
        const res = await customerService.registerInit(name, email, password, phone);
        if (res.autoConfirmed && res.user) {
          setUser(res.user);
          setCachedCustomerUser(res.user);
          requestPersistentStorage();
        }
        return res;
      },
      verifyRegisterOtp: async (email: string, token: string) => {
        const nextUser = await customerService.verifyRegisterOtp(email, token);
        setUser(nextUser);
        setCachedCustomerUser(nextUser);
        requestPersistentStorage();
        setIsAuthOpen(false);
      },
      resendRegisterOtp: async (email: string) => {
        await customerService.resendRegisterOtp(email);
      },
      resetPassword: async (email: string) => {
        return await customerService.resetPassword(email);
      },
      logout: () => {
        setCachedCustomerUser(null);
        setUser(null);
        void customerService.logout();
      },
      deleteAccount: async () => {
        const targetId = user?.id;
        const targetEmail = user?.email;
        const targetPhone = user?.phone;
        setCachedCustomerUser(null);
        setUser(null);
        return await customerService.deleteAccount(targetId, targetEmail || targetPhone);
      },
      updateProfile: (updates: Partial<User>) => {
        const targetId = user?.id;
        setUser((prev) => {
          const updated = prev ? { ...prev, ...updates } : null;
          setCachedCustomerUser(updated);
          return updated;
        });
        if (targetId) {
          void customerService.updateUserProfile(targetId, updates);
        }
      },
    }),
    [initializing, isAuthOpen, needsProfileCompletion, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
