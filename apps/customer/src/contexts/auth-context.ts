import { createContext } from 'react';
import type { User } from '../shared/types/customer.types';

export interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isAuthOpen: boolean;
  showAuthModal: () => void;
  hideAuthModal: () => void;
  login: (name: string, phone: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
