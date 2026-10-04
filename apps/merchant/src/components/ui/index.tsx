import { Eye, EyeOff, LoaderCircle, RotateCcw, TriangleAlert, X } from 'lucide-react';
import { useId, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  fullWidth?: boolean;
}

export function Button({ variant = 'primary', size = 'medium', loading, fullWidth, className = '', children, disabled, ...props }: ButtonProps) {
  return <button className={`merchant-button merchant-button--${variant} merchant-button--${size} ${fullWidth ? 'merchant-button--full' : ''} ${className}`} disabled={disabled || loading} {...props}>{loading && <LoaderCircle className="spin" size={17} />}{children}</button>;
}

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> { label: string; error?: string; icon?: ReactNode; isPassword?: boolean; }
export function Field({ label, error, icon, isPassword, className = '', ...props }: FieldProps) {
  const id = useId(); const [visible, setVisible] = useState(false);
  return <label className={`merchant-field ${error ? 'has-error' : ''} ${className}`} htmlFor={id}><span>{label}</span><div className="merchant-field-control">{icon}<input id={id} type={isPassword && !visible ? 'password' : props.type} {...props} />{isPassword && <button type="button" aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} onClick={() => setVisible((value) => !value)}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button>}</div>{error && <small>{error}</small>}</label>;
}

interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> { label: string; error?: string; }
export function TextAreaField({ label, error, ...props }: TextAreaFieldProps) { const id = useId(); return <label className={`merchant-field ${error ? 'has-error' : ''}`} htmlFor={id}><span>{label}</span><div className="merchant-field-control merchant-field-control--textarea"><textarea id={id} {...props} /></div>{error && <small>{error}</small>}</label>; }

export function SelectField({ label, children, ...props }: { label: string; children: ReactNode } & React.SelectHTMLAttributes<HTMLSelectElement>) { const id = useId(); return <label className="merchant-field" htmlFor={id}><span>{label}</span><div className="merchant-field-control"><select id={id} {...props}>{children}</select></div></label>; }

export function Modal({ open, title, description, onClose, children, size = 'medium', className = '' }: { open: boolean; title: string; description?: string; onClose: () => void; children: ReactNode; size?: 'small' | 'medium' | 'large'; className?: string }) {
  if (!open) return null;
  return <div className="merchant-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className={`merchant-modal merchant-modal--${size} ${className}`} role="dialog" aria-modal="true" aria-label={title}><header><div><h2>{title}</h2>{description && <p>{description}</p>}</div><button type="button" aria-label="Đóng" onClick={onClose}><X size={20} /></button></header><div className="merchant-modal-body">{children}</div></section></div>;
}

export function LoadingSpinner({ message = 'Đang tải dữ liệu...' }: { message?: string }) { return <div className="merchant-state"><LoaderCircle className="spin" size={34} /><strong>{message}</strong></div>; }
export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) { return <div className="merchant-state merchant-state--error"><TriangleAlert size={34} /><strong>Đã có lỗi xảy ra</strong><p>{message}</p><Button variant="outline" onClick={onRetry}><RotateCcw size={16} /> Thử lại</Button></div>; }
export function EmptyState({ icon, title, message, action }: { icon: ReactNode; title: string; message: string; action?: ReactNode }) { return <div className="merchant-state"><span className="merchant-state-icon">{icon}</span><strong>{title}</strong><p>{message}</p>{action}</div>; }
export function ToastBar({ message }: { message: string | null }) { return message ? <div className="merchant-toast" role="status">✓ {message}</div> : null; }
export function SkeletonCard({ height = 120, className = '' }: { height?: number | string; className?: string }) { return <div className={`merchant-skeleton ${className}`} style={{ height, width: '100%' }} />; }
export function SkeletonList({ count = 3, height = 110 }: { count?: number; height?: number | string }) { return <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>{Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} height={height} />)}</div>; }
