import { createContext } from 'react';
import type { User } from '../shared/types/customer.types';

export interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isAuthOpen: boolean;
  showAuthModal: () => void;
  hideAuthModal: () => void;
  login: (identifier: string, password?: string, name?: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  register: (name: string, identifier: string, password?: string) => Promise<void>;
  sendEmailOtp: (email: string) => Promise<boolean>;
  verifyEmailOtp: (email: string, token: string) => Promise<void>;
  resetPassword: (email: string) => Promise<boolean>;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
