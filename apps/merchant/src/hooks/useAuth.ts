import { useState } from 'react';
import { changePasswordService, completeSetupService, loginService, logoutService } from '../services/auth.service';
import type { AuthUser, LoginCredentials } from '../types';

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = async (credentials: LoginCredentials) => {
    setLoading(true); setError(null);
    try { const nextUser = await loginService(credentials); setUser(nextUser); return nextUser; }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thể đăng nhập.'); return null; }
    finally { setLoading(false); }
  };
  const changePassword = async (oldPassword: string, newPassword: string) => {
    if (!user) return false;
    setLoading(true); setError(null);
    try { return await changePasswordService(user.id, oldPassword, newPassword); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thể đổi mật khẩu.'); return false; }
    finally { setLoading(false); }
  };
  const completeSetup = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await completeSetupService(user.id);
      setUser((current) => current ? { ...current, isFirstLogin: false } : current);
    } finally {
      setLoading(false);
    }
  };
  const logout = async () => { setLoading(true); await logoutService(); setUser(null); setLoading(false); };
  return { user, loading, error, login, changePassword, completeSetup, logout, clearError: () => setError(null) };
}
