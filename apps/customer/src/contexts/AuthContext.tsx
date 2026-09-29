import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { customerService } from '../services/customer.service';
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
