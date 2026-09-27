import React, { useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  HelpCircle,
  Mail,
  MessageSquare,
  Phone,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import { Button, Input } from '@gosavingfood/ui';
import type { User } from '../../../shared/types/customer.types';

interface HelpSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
}

const FAQ_ITEMS = [
  {
    q: 'Làm thế nào để lấy túi thực phẩm tại cửa hàng?',
    a: 'Sau khi đặt hàng thành công, bạn chỉ cần đến cửa hàng trong đúng khung giờ nhận hàng đã chọn. Mở mục "Đơn hàng của tôi", xuất trình mã QR hoặc mã đơn 6 số cho nhân viên để nhận túi thực phẩm.',
  },
  {
    q: 'Thực phẩm giải cứu có đảm bảo an toàn và vệ sinh không?',
    a: '100% đối tác trên GoSavingFood đều được kiểm định tiêu chuẩn an toàn vệ sinh thực phẩm. Món ăn trong túi là đồ ăn tươi ngon trong ngày chưa bán hết của ca, hoàn toàn không phải đồ quá hạn hay hỏng.',
  },
  {
    q: 'Nếu cửa hàng hết món hoặc đóng cửa trước giờ hẹn thì sao?',
    a: 'Bạn vui lòng gửi yêu cầu hỗ trợ ngay tại đây hoặc chọn "Báo cáo sự cố" trong chi tiết đơn hàng. Đội ngũ Admin GoSavingFood sẽ xác minh và hoàn tiền 100% ngay cho bạn.',
  },
  {
    q: 'Tôi có thể hủy đơn hàng đã đặt không?',
    a: 'Bạn có thể hủy đơn miễn phí trước khi cửa hàng bắt đầu chuẩn bị món. Sau khung giờ lấy hàng hoặc khi đơn đã hoàn tất đóng gói, đơn hàng không thể hủy để tránh lãng phí thực phẩm.',
  },
  {
    q: 'Làm sao để liên hệ tổng đài khẩn cấp?',
    a: 'Bạn có thể gọi hotline 1900 6868 (8:00 - 22:00 hàng ngày) hoặc gửi email đến support@gosavingfood.vn để được hỗ trợ tức thì.',
  },
];

const ISSUE_TOPICS = [
  '📦 Đơn hàng & Lấy món',
  '💳 Thanh toán & Hoàn tiền',
  '🏪 Cửa hàng & Thực phẩm',
  '👤 Tài khoản & Đăng nhập',
  '💡 Góp ý & Khiếu nại khác',
];

export const HelpSupportModal: React.FC<HelpSupportModalProps> = ({
  isOpen,
  onClose,
  user,
}) => {
  const [activeTab, setActiveTab] = useState<'contact' | 'faq'>('contact');
  const [selectedTopic, setSelectedTopic] = useState(ISSUE_TOPICS[0]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [contactInfo, setContactInfo] = useState(user?.phone || user?.email || '');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [ticketId, setTicketId] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    const randomTicket = `GSF-${Math.floor(100000 + Math.random() * 900000)}`;
    setTicketId(randomTicket);
    setIsSubmitted(true);
  };

  const handleReset = () => {
    setIsSubmitted(false);
    setTitle('');
    setContent('');
    setSelectedTopic(ISSUE_TOPICS[0]);
  };

  return (
    <div className="gsf-drawer-backdrop" onClick={onClose} role="presentation">
      <div
        className="gsf-drawer-bottom gsf-drawer-bottom--large"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-support-title"
      >
        <div className="gsf-drawer-handle" />

        <div className="gsf-drawer-header">
          <div className="gsf-drawer-title-group">
            <div className="gsf-drawer-icon-wrap">
              <HelpCircle size={20} />
            </div>
            <div>
              <h2 id="help-support-title" className="gsf-drawer-title">
                Trợ giúp & FAQ
              </h2>
              <p className="gsf-drawer-subtitle">
                Giải đáp thắc mắc và gửi yêu cầu hỗ trợ tới Admin
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

        <div className="customer-modal-tabs">
          <button
            type="button"
            className={`customer-modal-tab ${activeTab === 'contact' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('contact')}
          >
            <Send size={15} /> Gửi hỗ trợ Admin
          </button>
          <button
            type="button"
            className={`customer-modal-tab ${activeTab === 'faq' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('faq')}
          >
            <MessageSquare size={15} /> Câu hỏi thường gặp
          </button>
        </div>

        <div className="gsf-drawer-body">
          {activeTab === 'contact' ? (
            isSubmitted ? (
              <div className="customer-support-success">
                <div className="customer-support-success-icon">
                  <CheckCircle2 size={54} />
                </div>
                <h3>Đã gửi yêu cầu thành công!</h3>
                <div className="customer-support-ticket-badge">
                  <span>Mã yêu cầu hỗ trợ:</span>
                  <strong>#{ticketId}</strong>
                </div>
                <p>
                  Cảm ơn bạn đã gửi phản hồi. Đội ngũ Quản trị viên (Admin)
                  GoSavingFood đã tiếp nhận và sẽ phản hồi qua số điện thoại/email
                  của bạn trong vòng 24 giờ.
                </p>
                <div className="customer-support-success-actions">
                  <Button
                    fullWidth
                    variant="primary"
                    size="md"
                    onClick={onClose}
                  >
                    Đã hiểu & Đóng
                  </Button>
                  <Button
                    fullWidth
                    variant="secondary"
                    size="md"
                    onClick={handleReset}
                  >
                    Gửi yêu cầu hỗ trợ khác
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="customer-support-form">
                <div className="customer-support-notice">
                  <Sparkles size={16} />
                  <span>
                    Admin GoSavingFood luôn sẵn sàng hỗ trợ xử lý sự cố đơn hàng,
                    thanh toán và chất lượng dịch vụ 24/7.
                  </span>
                </div>

                <div className="customer-form-field">
                  <label className="customer-form-label">
                    Chủ đề cần hỗ trợ <span className="text-danger">*</span>
                  </label>
                  <div className="customer-topic-chips">
                    {ISSUE_TOPICS.map((topic) => (
                      <button
                        key={topic}
                        type="button"
                        className={`customer-topic-chip ${
                          selectedTopic === topic ? 'is-active' : ''
                        }`}
                        onClick={() => setSelectedTopic(topic)}
                      >
                        {topic}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="customer-form-field">
                  <label className="customer-form-label">
                    Tiêu đề yêu cầu
                  </label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="VD: Cần hỗ trợ kiểm tra đơn hàng, sự cố mã giảm..."
                  />
                </div>

                <div className="customer-form-field">
                  <label className="customer-form-label">
                    Chi tiết nội dung cần hỗ trợ <span className="text-danger">*</span>
                  </label>
                  <textarea
                    className="customer-textarea"
                    rows={4}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Mô tả cụ thể vấn đề hoặc phản ánh của bạn để Admin xử lý nhanh nhất có thể..."
                    required
                  />
                </div>

                <div className="customer-form-field">
                  <label className="customer-form-label">
                    Thông tin liên hệ nhận phản hồi (SĐT / Email)
                  </label>
                  <Input
                    value={contactInfo}
                    onChange={(e) => setContactInfo(e.target.value)}
                    leftIcon={<Phone size={16} />}
                    placeholder="Số điện thoại hoặc email liên hệ"
                  />
                </div>

                <div className="customer-panel-actions">
                  <Button
                    fullWidth
                    variant="primary"
                    size="md"
                    type="submit"
                    disabled={!content.trim()}
                  >
                    <Send size={16} /> Gửi thông báo hỗ trợ cho Admin
                  </Button>
                </div>
              </form>
            )
          ) : (
            <div className="customer-faq-list">
              <div className="customer-support-notice">
                <HelpCircle size={16} />
                <span>
                  Các câu hỏi thường gặp khi sử dụng GoSavingFood để giải cứu thực phẩm.
                </span>
              </div>

              {FAQ_ITEMS.map((item, index) => {
                const isOpen = openFaqIndex === index;
                return (
                  <div key={item.q} className="customer-faq-card">
                    <button
                      type="button"
                      className="customer-faq-question"
                      onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    >
                      <span>{item.q}</span>
                      <ChevronDown
                        size={17}
                        className={`customer-faq-chevron ${isOpen ? 'is-open' : ''}`}
                      />
                    </button>
                    {isOpen && (
                      <div className="customer-faq-answer">
                        <p>{item.a}</p>
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="customer-faq-contacts">
                <h4>Kênh hỗ trợ trực tiếp</h4>
                <div className="customer-faq-contact-grid">
                  <a href="tel:19006868" className="customer-faq-contact-item">
                    <Phone size={18} />
                    <div>
                      <strong>1900 6868</strong>
                      <small>Tổng đài (8:00 - 22:00)</small>
                    </div>
                  </a>
                  <a
                    href="mailto:support@gosavingfood.vn"
                    className="customer-faq-contact-item"
                  >
                    <Mail size={18} />
                    <div>
                      <strong>support@gosavingfood.vn</strong>
                      <small>Email tiếp nhận</small>
                    </div>
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
