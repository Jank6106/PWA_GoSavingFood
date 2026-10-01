import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { customerService } from '../services/customer.service';
import { supabase } from '../services/supabase';
import type { User } from '../shared/types/customer.types';
import { AuthContext } from './auth-context';
import type { AuthContextValue } from './auth-context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  useEffect(() => {
    customerService.getUser().then((existing) => {
      if (existing) setUser(existing);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const fullUser = await customerService.getUser();
        if (fullUser) {
          setUser(fullUser);
        } else {
          const meta = session.user.user_metadata || {};
          setUser({
            id: session.user.id,
            name:
              meta.full_name ||
              meta.name ||
              session.user.email?.split('@')[0] ||
              'Khách hàng',
            phone: meta.phone || '',
            email: session.user.email,
            avatar: meta.avatar_url || meta.picture || meta.avatar,
          });
        }
      } else if (_event === 'SIGNED_OUT') {
        setUser(null);
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
        setIsAuthOpen(false);
      },
      loginWithGoogle: async () => {
        await customerService.loginWithGoogle();
      },
      register: async (name, identifier, password) => {
        const nextUser = await customerService.register(name, identifier, password);
        setUser(nextUser);
        setIsAuthOpen(false);
      },
      logout: () => {
        void customerService.logout();
        setUser(null);
      },
      updateProfile: (updates: Partial<User>) => {
        setUser((prev) => (prev ? { ...prev, ...updates } : null));
      },
    }),
    [isAuthOpen, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
