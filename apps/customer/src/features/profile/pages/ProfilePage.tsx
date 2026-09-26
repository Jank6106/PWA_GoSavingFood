import { Bell, ChevronRight, CreditCard, Download, Gift, HelpCircle, LogOut, MapPinned, ReceiptText, Share2 } from 'lucide-react';
import { Badge } from '@gosavingfood/ui';
import { AuthRequiredState, SectionHeading } from '../../../shared/components';
import type { User } from '../../../shared/types/customer.types';

interface ProfilePageProps {
  user: User | null;
  isStandalone: boolean;
  onLogin: () => void;
  onLogout: () => void;
  onOrders: () => void;
  onNotifications: () => void;
  onLocation: () => void;
  onInstall: () => void;
}

export function ProfilePage(props: ProfilePageProps) {
  if (!props.user) return <AuthRequiredState icon="👋" title="Xin chào!" description="Đăng nhập để quản lý tài khoản và theo dõi tác động xanh của bạn." onLogin={props.onLogin} />;
  const menu = [
    { label: 'Đơn hàng của tôi', Icon: ReceiptText, action: props.onOrders },
    { label: 'Địa chỉ đã lưu', Icon: MapPinned, action: props.onLocation },
    { label: 'Phương thức thanh toán', Icon: CreditCard },
    { label: 'Mã giảm giá của tôi', Icon: Gift },
    { label: 'Thông báo', Icon: Bell, action: props.onNotifications },
    ...(!props.isStandalone ? [{ label: 'Cài đặt ứng dụng', Icon: Download, action: props.onInstall }] : []),
  ];
  return (
    <div className="customer-screen customer-profile-screen">
      <section className="customer-profile-card"><div className="customer-avatar">{props.user.name.charAt(0)}</div><div><h1>{props.user.name}</h1><p>{props.user.phone}</p><Badge variant="success">Người cứu thực phẩm tích cực</Badge></div></section>
      <section><SectionHeading icon="🌱" title="Tác động của bạn" subtitle="Mỗi lựa chọn đều tạo khác biệt" /><div className="customer-impact-grid"><div><strong>6</strong><span>Bữa ăn đã cứu</span></div><div><strong>285K</strong><span>Đã tiết kiệm</span></div><div><strong>15kg</strong><span>CO₂ giảm</span></div></div></section>
      <section className="customer-menu-card">{menu.map(({ label, Icon, action }) => <button type="button" key={label} onClick={action}><span><Icon size={19} /> {label}</span><ChevronRight size={18} /></button>)}</section>
      <section className="customer-menu-card"><button type="button" onClick={() => navigator.share?.({ title: 'GoSavingFood', url: window.location.href })}><span><Share2 size={19} /> Chia sẻ ứng dụng</span><ChevronRight size={18} /></button><button type="button"><span><HelpCircle size={19} /> Trợ giúp & FAQ</span><ChevronRight size={18} /></button></section>
      <button type="button" className="customer-logout-button" onClick={props.onLogout}><LogOut size={18} /> Đăng xuất</button>
    </div>
  );
}
