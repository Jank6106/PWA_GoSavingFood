import { LockKeyhole, ShieldCheck, Store, UserRound } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { AuthUser, LoginCredentials } from '../types';
import { Button, Field } from '../components/ui';

export function LoginScreen({ loading, error, onLogin, onClearError }: { loading: boolean; error: string | null; onLogin: (credentials: LoginCredentials) => Promise<AuthUser | null>; onClearError: () => void }) {
  const [username, setUsername] = useState('merchant@gosavingfood.vn'); const [password, setPassword] = useState('12345600Aa!'); const [localError, setLocalError] = useState('');
  const submit = async (event: FormEvent) => { event.preventDefault(); setLocalError(''); onClearError(); if (!username.trim()) return setLocalError('Vui lòng nhập số điện thoại hoặc email'); if (!password) return setLocalError('Vui lòng nhập mật khẩu'); await onLogin({ username, password }); };
  return <main className="merchant-auth-page"><section className="merchant-auth-card"><div className="merchant-auth-brand"><span><Store size={32} /></span><h1>GoSavingFood</h1><div><ShieldCheck size={14} /> Kênh Cửa Hàng</div><p>Quản lý món ngon, giảm lãng phí và tạo thêm giá trị mỗi ngày.</p></div><form className="merchant-form" onSubmit={submit}><Field label="Email hoặc số điện thoại" icon={<UserRound size={18} />} value={username} onChange={(event) => setUsername(event.target.value)} placeholder="merchant@gosavingfood.vn" /><Field label="Mật khẩu" icon={<LockKeyhole size={18} />} isPassword value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Nhập mật khẩu" />{(localError || error) && <div className="merchant-form-error">{localError || error}</div>}<Button type="submit" size="large" fullWidth loading={loading}>Đăng nhập</Button></form><small className="merchant-demo-note">Tài khoản demo: <strong>merchant@gosavingfood.vn</strong> / <strong>12345600Aa!</strong></small></section></main>;
}

