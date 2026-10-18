import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { supabase } from '../services/supabase';
import logoSvg from '../assets/logo.svg';
import logoPng from '../assets/logo.png';

interface Props {
  onLoginSuccess: (user: any) => void;
}

export const LoginScreen: React.FC<Props> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // 1. Đăng nhập qua Supabase Auth
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        // Hỗ trợ đăng nhập nhanh tài khoản admin demo nếu Supabase chưa seed auth
        if (
          (email.trim() === 'admin@gosavingfood.vn' || email.trim() === 'admin') &&
          password === 'admin123'
        ) {
          const mockAdmin = {
            id: '00000000-0000-0000-0000-000000000001',
            email: 'admin@gosavingfood.vn',
            role: 'ADMIN',
            user_metadata: { full_name: 'Super Administrator' },
          };
          localStorage.setItem('gsf_admin_session', JSON.stringify(mockAdmin));
          onLoginSuccess(mockAdmin);
          return;
        }
        throw authError;
      }

      if (data.user) {
        // 2. Kiểm tra role admin trong public.users
        const { data: profile } = await supabase
          .from('users')
          .select('role, full_name')
          .eq('id', data.user.id)
          .single();

        if (profile?.role !== 'ADMIN' && data.user.user_metadata?.role !== 'ADMIN') {
          await supabase.auth.signOut();
          throw new Error('Tài khoản này không có quyền truy cập trang Quản trị (Admin).');
        }

        localStorage.setItem('gsf_admin_session', JSON.stringify(data.user));
        onLoginSuccess(data.user);
      }
    } catch (err: any) {
      setError(err.message || 'Đăng nhập thất bại.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = () => {
    const mockAdmin = {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'admin@gosavingfood.vn',
      role: 'ADMIN',
      user_metadata: { full_name: 'Super Administrator' },
    };
    localStorage.setItem('gsf_admin_session', JSON.stringify(mockAdmin));
    onLoginSuccess(mockAdmin);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: 'radial-gradient(circle at top, #EEF4E4 0%, #F4F1E8 60%)',
        padding: '20px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          background: '#ffffff',
          border: '1px solid #D9D5CB',
          borderRadius: '24px',
          padding: '36px',
          boxShadow: '0 16px 40px rgba(25, 59, 44, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}
      >
        {/* Brand header */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div
            style={{
              width: '68px',
              height: '68px',
              borderRadius: '20px',
              background: '#166B4A',
              display: 'grid',
              placeItems: 'center',
              marginBottom: '14px',
              boxShadow: '0 8px 20px rgba(22, 107, 74, 0.25)',
              padding: '12px',
            }}
          >
            <img
              src={logoSvg}
              onError={(e) => {
                const target = e.currentTarget;
                if (target.src !== logoPng) {
                  target.src = logoPng;
                }
              }}
              alt="GoSavingFood Logo"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                filter: 'brightness(0) invert(1)',
              }}
            />
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: '800', margin: 0, color: '#193B2C', letterSpacing: '-0.3px' }}>
            GoSavingFood Admin
          </h1>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              marginTop: '6px',
              padding: '4px 10px',
              borderRadius: '999px',
              background: '#EEF4E4',
              color: '#166B4A',
              fontSize: '11px',
              fontWeight: '700',
            }}
          >
            <ShieldCheck size={13} /> CỔNG QUẢN TRỊ YINDII MODEL
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: '12px',
              borderRadius: '12px',
              background: '#FEE2E2',
              border: '1px solid #FCA5A5',
              color: '#DC2626',
              fontSize: '13px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: '#193B2C' }}>
              Email Quản Trị Viên
            </label>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '0 14px',
                height: '46px',
                border: '1.5px solid #D9D5CB',
                borderRadius: '12px',
                background: '#EEF4E4',
              }}
            >
              <Mail size={16} color="#166B4A" />
              <input
                required
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@gosavingfood.vn"
                style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', fontSize: '14px', color: '#193B2C', fontWeight: '600' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: '#193B2C' }}>
              Mật Khẩu
            </label>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '0 14px',
                height: '46px',
                border: '1.5px solid #D9D5CB',
                borderRadius: '12px',
                background: '#EEF4E4',
              }}
            >
              <Lock size={16} color="#166B4A" />
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', fontSize: '14px', color: '#193B2C' }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              height: '48px',
              borderRadius: '12px',
              border: 'none',
              background: '#166B4A',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '4px',
              boxShadow: '0 4px 14px rgba(22, 107, 74, 0.25)',
            }}
          >
            {loading ? 'Đang xác thực...' : 'Đăng Nhập Quản Trị'} <ArrowRight size={16} />
          </button>
        </form>

        <div style={{ textAlign: 'center', borderTop: '1px solid #edf4ef', paddingTop: '16px' }}>
          <span style={{ fontSize: '12px', color: '#7D8E82' }}>Dành cho thử nghiệm nội bộ:</span>
          <button
            type="button"
            onClick={handleQuickDemo}
            style={{
              marginTop: '8px',
              width: '100%',
              padding: '10px',
              borderRadius: '10px',
              border: '1px solid #D9D5CB',
              background: '#F4F1E8',
              color: '#166B4A',
              fontWeight: '700',
              fontSize: '12.5px',
              cursor: 'pointer',
            }}
          >
            Đăng Nhập Nhanh (Demo SuperAdmin)
          </button>
        </div>
      </div>
    </div>
  );
};
