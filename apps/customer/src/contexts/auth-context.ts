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
  registerInit: (
    name: string,
    email: string,
    password?: string,
    phone?: string
  ) => Promise<{ email: string; autoConfirmed?: boolean; user?: User | null }>;
  verifyRegisterOtp: (email: string, token: string) => Promise<void>;
  resendRegisterOtp: (email: string) => Promise<void>;
  resetPassword: (email: string) => Promise<boolean>;
  logout: () => void;
  deleteAccount: () => Promise<{ success: boolean; message?: string }>;
  updateProfile: (updates: Partial<User>) => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
