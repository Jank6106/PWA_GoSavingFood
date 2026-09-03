import React from 'react';
import {
  TreePine,
  PiggyBank,
  UtensilsCrossed,
  Download,
  HelpCircle,
  Share2,
  Info,
  ChevronRight,
} from 'lucide-react';
import { Card, Badge } from '@gosavingfood/ui';

interface ProfilePageProps {
  onInstallClick?: () => void;
  isStandalone?: boolean;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  onInstallClick,
  isStandalone = false,
}) => {
  return (
    <div className="customer-page-profile">
      {/* Header Profile */}
      <Card className="customer-profile-hero">
        <div className="customer-profile-avatar-wrap">
          <div className="customer-profile-avatar">
            <span>🙋‍♂️</span>
          </div>
          <div className="customer-profile-user-info">
            <h2 className="customer-profile-name">Nguyễn Văn Khách</h2>
            <p className="customer-profile-phone">090 ••• ••89</p>
            <Badge variant="success">Người Cứu Thực Phẩm Tích Cực</Badge>
          </div>
        </div>
      </Card>

      {/* Thống kê tác động xanh (Green Impact) */}
      <section className="customer-impact-section">
        <h3 className="customer-section-title">Tác động tích cực của bạn</h3>
        <div className="customer-impact-grid">
          <Card className="customer-impact-card">
            <div className="customer-impact-icon customer-impact-icon--meals">
              <UtensilsCrossed size={20} strokeWidth={2} />
            </div>
            <div className="customer-impact-value">6</div>
            <div className="customer-impact-label">Bữa ăn đã cứu</div>
          </Card>

          <Card className="customer-impact-card">
            <div className="customer-impact-icon customer-impact-icon--money">
              <PiggyBank size={20} strokeWidth={2} />
            </div>
            <div className="customer-impact-value">285.000đ</div>
            <div className="customer-impact-label">Đã tiết kiệm</div>
          </Card>

          <Card className="customer-impact-card">
            <div className="customer-impact-icon customer-impact-icon--co2">
              <TreePine size={20} strokeWidth={2} />
            </div>
            <div className="customer-impact-value">15.0 kg</div>
            <div className="customer-impact-label">CO₂ tránh phát thải</div>
          </Card>
        </div>
      </section>

      {/* Menu cài đặt & tiện ích */}
      <section className="customer-settings-section">
        <h3 className="customer-section-title">Ứng dụng & Hỗ trợ</h3>
        <Card className="customer-menu-list">
          {!isStandalone && onInstallClick && (
            <button
              type="button"
              className="customer-menu-item"
              onClick={onInstallClick}
            >
              <div className="customer-menu-item-left">
                <Download size={18} className="customer-green-text" />
                <span>Cài đặt GoSavingFood ra Màn hình chính</span>
              </div>
              <ChevronRight size={18} className="customer-muted-text" />
            </button>
          )}

          <button
            type="button"
            className="customer-menu-item"
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: 'GoSavingFood',
                  text: 'Cùng mình giải cứu đồ ăn ngon giá siêu tốt mỗi ngày nhé!',
                  url: window.location.origin,
                }).catch(() => {});
              } else {
                alert('Đã sao chép liên kết GoSavingFood để chia sẻ!');
              }
            }}
          >
            <div className="customer-menu-item-left">
              <Share2 size={18} />
              <span>Chia sẻ ứng dụng cho bạn bè</span>
            </div>
            <ChevronRight size={18} className="customer-muted-text" />
          </button>

          <button
            type="button"
            className="customer-menu-item"
            onClick={() => alert('Trung tâm trợ giúp: Vui lòng liên hệ hotline 1900-GSF hoặc email support@gosavingfood.vn')}
          >
            <div className="customer-menu-item-left">
              <HelpCircle size={18} />
              <span>Trợ giúp & Câu hỏi thường gặp</span>
            </div>
            <ChevronRight size={18} className="customer-muted-text" />
          </button>

          <button
            type="button"
            className="customer-menu-item"
            onClick={() => alert('GoSavingFood Customer PWA v1.0.0 — Nền tảng kết nối giải cứu thực phẩm tươi')}
          >
            <div className="customer-menu-item-left">
              <Info size={18} />
              <span>Về GoSavingFood</span>
            </div>
            <ChevronRight size={18} className="customer-muted-text" />
          </button>
        </Card>
      </section>

      <div className="customer-profile-footer">
        <p>GoSavingFood Customer PWA • Phiên bản 1.0.0</p>
      </div>
    </div>
  );
};
