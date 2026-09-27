import React, { useState } from 'react';
import { FileText, Lock, RefreshCw, ShieldCheck, UtensilsCrossed, X } from 'lucide-react';
import { Button } from '@gosavingfood/ui';

interface PolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const POLICY_SECTIONS = [
  {
    id: 'privacy',
    title: 'Bảo mật thông tin',
    icon: Lock,
    content: (
      <>
        <h4>1. Cam kết bảo mật dữ liệu</h4>
        <p>
          GoSavingFood cam kết bảo vệ toàn diện dữ liệu thông tin cá nhân của người
          dùng bao gồm họ tên, số điện thoại, email và vị trí địa lý. Chúng tôi
          không chia sẻ hoặc bán dữ liệu cho bất kỳ bên thứ ba nào vì mục đích
          thương mại.
        </p>
        <h4>2. Mục đích thu thập dữ liệu</h4>
        <p>
          Dữ liệu thu thập chỉ được dùng nhằm xác thực đơn hàng, liên hệ khi giao nhận
          túi thực phẩm, hỗ trợ khách hàng và tối ưu hóa trải nghiệm tìm kiếm cửa
          hàng lân cận.
        </p>
        <h4>3. Lưu trữ và mã hóa an toàn</h4>
        <p>
          Toàn bộ thông tin tài khoản và giao dịch thanh toán trực tuyến được bảo vệ
          bằng các tiêu chuẩn mã hóa SSL/TLS hiện đại nhất.
        </p>
      </>
    ),
  },
  {
    id: 'terms',
    title: 'Điều khoản dịch vụ',
    icon: FileText,
    content: (
      <>
        <h4>1. Khái niệm túi thực phẩm bất ngờ (Surprise Bag)</h4>
        <p>
          Túi thực phẩm bất ngờ là các món ăn tươi ngon trong ngày chưa bán hết của
          cửa hàng đối tác. Món ăn cụ thể bên trong túi phụ thuộc vào lượng thực
          phẩm dư thừa trong ngày của từng cơ sở.
        </p>
        <h4>2. Quy định thời gian nhận hàng</h4>
        <p>
          Khách hàng có trách nhiệm đến đúng khung giờ hẹn nhận hàng đã được thông báo
          rõ trên vé điện tử. Nếu quá giờ lấy hàng mà khách hàng không đến, cửa hàng
          có quyền xử lý túi thực phẩm để đảm bảo quy định an toàn vệ sinh và đơn hàng
          sẽ không được hoàn tiền.
        </p>
        <h4>3. Hành vi bị nghiêm cấm</h4>
        <p>
          Nghiêm cấm hành vi đặt đơn ảo, không đến nhận nhiều lần hoặc có hành vi gian
          lận mã giảm giá gây thiệt hại cho cửa hàng đối tác.
        </p>
      </>
    ),
  },
  {
    id: 'safety',
    title: 'An toàn thực phẩm',
    icon: UtensilsCrossed,
    content: (
      <>
        <h4>1. Tiêu chuẩn đối tác</h4>
        <p>
          Tất cả nhà hàng, tiệm bánh và cửa hàng tham gia nền tảng GoSavingFood đều
          phải có Giấy chứng nhận đủ điều kiện an toàn vệ sinh thực phẩm hợp lệ.
        </p>
        <h4>2. Chất lượng thực phẩm cứu hộ</h4>
        <p>
          Thực phẩm giải cứu là thực phẩm nguyên vẹn, đảm bảo điều kiện bảo quản nhiệt
          độ tiêu chuẩn và có hạn sử dụng tốt nhất trong ngày. GoSavingFood nghiêm
          cấm bán thực phẩm ôi thiu, hỏng hóc hoặc quá hạn.
        </p>
        <h4>3. Trách nhiệm người tiêu dùng</h4>
        <p>
          Khách hàng nên sử dụng hoặc bảo quản tủ lạnh ngay sau khi nhận món từ cửa
          hàng để đảm bảo độ ngon và an toàn tối đa.
        </p>
      </>
    ),
  },
  {
    id: 'refund',
    title: 'Hoàn tiền & Đổi trả',
    icon: RefreshCw,
    content: (
      <>
        <h4>1. Trường hợp được hoàn tiền 100%</h4>
        <p>
          • Cửa hàng đóng cửa hoặc hết đồ ăn trước khi khách hàng đến trong khung
          giờ hẹn.
          <br />
          • Thực phẩm khi nhận không đảm bảo chất lượng, có mùi lạ hoặc không đúng với
          mô tả loại món ăn.
          <br />• Đơn hàng bị lỗi hệ thống thanh toán hoặc trùng lặp giao dịch.
        </p>
        <h4>2. Thời gian xử lý hoàn tiền</h4>
        <p>
          Yêu cầu hoàn tiền sau khi được Admin xác minh qua mục "Trợ giúp & FAQ"
          sẽ được xử lý về tài khoản ngân hàng hoặc ví điện tử của khách hàng trong
          vòng 1 - 3 ngày làm việc.
        </p>
      </>
    ),
  },
];

export const PolicyModal: React.FC<PolicyModalProps> = ({ isOpen, onClose }) => {
  const [activePolicyId, setActivePolicyId] = useState(POLICY_SECTIONS[0].id);

  if (!isOpen) return null;

  const currentSection =
    POLICY_SECTIONS.find((s) => s.id === activePolicyId) || POLICY_SECTIONS[0];

  return (
    <div className="gsf-drawer-backdrop" onClick={onClose} role="presentation">
      <div
        className="gsf-drawer-bottom gsf-drawer-bottom--large"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="policy-modal-title"
      >
        <div className="gsf-drawer-handle" />

        <div className="gsf-drawer-header">
          <div className="gsf-drawer-title-group">
            <div className="gsf-drawer-icon-wrap">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 id="policy-modal-title" className="gsf-drawer-title">
                Chính sách & Điều khoản
              </h2>
              <p className="gsf-drawer-subtitle">
                Quy định sử dụng dịch vụ và bảo vệ người tiêu dùng
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

        <div className="customer-policy-tabs">
          {POLICY_SECTIONS.map((section) => {
            const IconComponent = section.icon;
            const isActive = activePolicyId === section.id;
            return (
              <button
                key={section.id}
                type="button"
                className={`customer-policy-tab-btn ${isActive ? 'is-active' : ''}`}
                onClick={() => setActivePolicyId(section.id)}
              >
                <IconComponent size={14} />
                <span>{section.title}</span>
              </button>
            );
          })}
        </div>

        <div className="gsf-drawer-body">
          <div className="customer-policy-content-box">
            <h3 className="customer-policy-section-title">
              {currentSection.title}
            </h3>
            <div className="customer-policy-body">{currentSection.content}</div>
          </div>
        </div>

        <div className="gsf-drawer-footer">
          <Button fullWidth variant="primary" size="md" onClick={onClose}>
            Đã hiểu & Đóng
          </Button>
        </div>
      </div>
    </div>
  );
};
