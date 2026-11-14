import { createContext } from 'react';
import type { User } from '../shared/types/customer.types';

export interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  initializing: boolean;
  isAuthOpen: boolean;
  needsProfileCompletion: boolean;
  showAuthModal: () => void;
  hideAuthModal: () => void;
  loginWithGoogle: () => Promise<void>;
  completeProfile: (data: { name: string; phone: string }) => Promise<void>;
  logout: () => void;
  deleteAccount: () => Promise<{ success: boolean; message?: string }>;
  updateProfile: (updates: Partial<User>) => void;

  // Tương thích ngược (nếu có component cũ gọi)
  login?: (identifier: string, password?: string, name?: string) => Promise<void>;
  registerInit?: (
    name: string,
    email: string,
    password?: string,
    phone?: string
  ) => Promise<{ email: string; autoConfirmed?: boolean; user?: User | null }>;
  verifyRegisterOtp?: (email: string, token: string) => Promise<void>;
  resendRegisterOtp?: (email: string) => Promise<void>;
  resetPassword?: (email: string) => Promise<boolean>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
