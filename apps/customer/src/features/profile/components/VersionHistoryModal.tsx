import React from 'react';
import { CheckCircle2, History, Sparkles, X } from 'lucide-react';
import { Badge, Button } from '@gosavingfood/ui';

interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface VersionUpdate {
  version: string;
  date: string;
  isLatest?: boolean;
  title: string;
  changes: string[];
}

const UPDATE_HISTORY: VersionUpdate[] = [
  {
    version: 'v1.2.0',
    date: '27/09/2026',
    isLatest: true,
    title: 'Cải tiến Trang Cá nhân & Hỗ trợ Khách hàng',
    changes: [
      'Tích hợp thanh gạt bật/tắt nhận thông báo ứng dụng tiện lợi.',
      'Thêm popup xem, quản lý và sao chép mã giảm giá (voucher) lên/xuống.',
      'Giao diện Trợ giúp & FAQ mới cho phép gửi phản hồi/yêu cầu trực tiếp tới Admin.',
      'Thêm trang xem chi tiết lịch sử phiên bản cập nhật.',
      'Bổ sung mục Chính sách & Quy định bảo vệ quyền lợi người dùng.',
      'Bổ sung quy trình xác nhận xóa tài khoản an toàn.',
    ],
  },
  {
    version: 'v1.1.0',
    date: '26/09/2026',
    title: 'Nâng cấp Giỏ hàng & Cá nhân hóa Hồ sơ',
    changes: [
      'Cho phép chạm vào sản phẩm trong Giỏ hàng để mở ngay trang chi tiết túi thực phẩm.',
      'Thêm thông báo toast hoạt ảnh mượt mà khi thêm món vào giỏ.',
      'Bổ sung chức năng chỉnh sửa ảnh đại diện đè lên avatar và nút đổi ảnh bìa.',
      'Thiết kế accordion chỉnh sửa thông tin cá nhân dạng bảng trượt xuống.',
      'Chuẩn hóa nút bấm màu xanh thương hiệu và căn giữa nội dung.',
    ],
  },
  {
    version: 'v1.0.5',
    date: '20/09/2026',
    title: 'Tối ưu Hiệu năng & Định vị GPS',
    changes: [
      'Tăng tốc độ tải trang ứng dụng PWA và hỗ trợ bộ nhớ đệm ngoại tuyến.',
      'Tích hợp định vị GPS hiển thị khoảng cách tới các cửa hàng lân cận.',
      'Cải thiện trải nghiệm thanh toán QR ngân hàng và MoMo.',
      'Sửa lỗi hiển thị mã lấy hàng sau khi hoàn tất đơn.',
    ],
  },
  {
    version: 'v1.0.0',
    date: '01/09/2026',
    title: 'Phát hành GoSavingFood chính thức',
    changes: [
      'Khởi chạy nền tảng kết nối cứu thực phẩm GoSavingFood.',
      'Cung cấp túi thực phẩm bất ngờ (Surprise Bags) giảm giá 50% - 70%.',
      'Đếm ngược thời gian nhận hàng và vé nhận hàng điện tử tiện lợi.',
      'Ghi nhận số lượng bữa ăn đã cứu và lượng khí thải CO₂ giảm thiểu.',
    ],
  },
];

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="gsf-drawer-backdrop" onClick={onClose} role="presentation">
      <div
        className="gsf-drawer-bottom gsf-drawer-bottom--large"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="version-history-title"
      >
        <div className="gsf-drawer-handle" />

        <div className="gsf-drawer-header">
          <div className="gsf-drawer-title-group">
            <div className="gsf-drawer-icon-wrap">
              <History size={20} />
            </div>
            <div>
              <h2 id="version-history-title" className="gsf-drawer-title">
                Lịch sử phiên bản
              </h2>
              <p className="gsf-drawer-subtitle">
                Chi tiết các tính năng và bản cập nhật GoSavingFood
              </p>
            </div>
          </div>
          <button
            type="button"
            className="gsf-drawer-close"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X size={20} />
          </button>
        </div>

        <div className="gsf-drawer-body">
          {/* Current Version Card */}
          <div className="customer-version-current-card">
            <div className="customer-version-app-icon" style={{ overflow: 'hidden', padding: 0 }}>
              <img src="/logo.png" alt="GoSavingFood" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '14px' }} />
            </div>
            <div className="customer-version-app-info">
              <div className="customer-version-app-badge-row">
                <strong>GoSavingFood PWA</strong>
                <Badge variant="success">Bản mới nhất</Badge>
              </div>
              <p>Phiên bản v1.2.0 · Cập nhật ngày 27/09/2026</p>
            </div>
          </div>

          <h3 className="customer-version-timeline-heading">
            <Sparkles size={16} /> Chi tiết từng bản cập nhật
          </h3>

          <div className="customer-version-timeline">
            {UPDATE_HISTORY.map((item) => (
              <div
                key={item.version}
                className={`customer-version-timeline-item ${
                  item.isLatest ? 'is-latest' : ''
                }`}
              >
                <div className="customer-version-timeline-marker">
                  <div className="customer-version-timeline-dot" />
                  <div className="customer-version-timeline-line" />
                </div>

                <div className="customer-version-content">
                  <div className="customer-version-item-header">
                    <div className="customer-version-badge-group">
                      <span className="customer-version-pill">{item.version}</span>
                      {item.isLatest && (
                        <span className="customer-version-current-tag">
                          <CheckCircle2 size={12} /> Hiện tại
                        </span>
                      )}
                    </div>
                    <span className="customer-version-date">{item.date}</span>
                  </div>

                  <h4 className="customer-version-item-title">{item.title}</h4>

                  <ul className="customer-version-change-list">
                    {item.changes.map((change, cIdx) => (
                      <li key={cIdx}>{change}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="gsf-drawer-footer">
          <Button fullWidth variant="primary" size="md" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </div>
    </div>
  );
};
