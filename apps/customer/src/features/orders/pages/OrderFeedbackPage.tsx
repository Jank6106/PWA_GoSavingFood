import { useState } from 'react';
import { Check, Send, Sparkles, Star } from 'lucide-react';
import { Button } from '@gosavingfood/ui';
import { ScreenHeader } from '../../../shared/components';
import type { Order } from '../../../shared/types/customer.types';

interface OrderFeedbackPageProps {
  mode: 'review' | 'report';
  order: Order;
  onBack: () => void;
  onSubmit: (feedback: { rating: number; tags: string[]; comment: string }) => void;
}

const REVIEW_TAGS = [
  '🌱 Thực phẩm tươi ngon',
  '🍱 Phần ăn đầy đặn',
  '💰 Tiết kiệm đáng kể',
  '📦 Đóng gói cẩn thận',
  '⏰ Đúng khung giờ hẹn',
  '👏 Nhân viên nhiệt tình',
];

const RATING_DESCRIPTIONS: Record<number, string> = {
  5: 'Tuyệt vời · Thực phẩm rất tươi ngon & tiết kiệm!',
  4: 'Ngon miệng · Hài lòng với phần ăn giải cứu.',
  3: 'Bình thường · Món ăn ở mức tạm ổn.',
  2: 'Chưa hài lòng · Cần cải thiện chất lượng.',
  1: 'Rất không hài lòng · Món ăn không đạt yêu cầu.',
};

const REPORT_ISSUES = [
  'Cửa hàng đóng cửa trước khung giờ hẹn',
  'Cửa hàng báo đã hết món',
  'Thực phẩm không đảm bảo vệ sinh / ôi thiu',
  'Món ăn sai lệch hoàn toàn so với mô tả',
  'Thái độ phục vụ của nhân viên chưa đúng mực',
  'Vấn đề khác',
];

export function OrderFeedbackPage({
  mode,
  order,
  onBack,
  onSubmit,
}: OrderFeedbackPageProps) {
  const isReview = mode === 'review';

  // Review states
  const [rating, setRating] = useState(order.review?.rating || 5);
  const [selectedTags, setSelectedTags] = useState<string[]>(
    order.review?.tags || [REVIEW_TAGS[0], REVIEW_TAGS[2]]
  );
  const [comment, setComment] = useState(order.review?.comment || '');

  // Report states
  const [selectedIssue, setSelectedIssue] = useState(REPORT_ISSUES[0]);
  const [reportDetail, setReportDetail] = useState('');

  const toggleTag = (tag: string) => {
    setSelectedTags((current) =>
      current.includes(tag)
        ? current.filter((t) => t !== tag)
        : [...current, tag]
    );
  };

  const handleFormSubmit = () => {
    if (isReview) {
      onSubmit({
        rating,
        tags: selectedTags,
        comment: comment.trim(),
      });
    } else {
      onSubmit({
        rating: 1,
        tags: [selectedIssue],
        comment: reportDetail.trim(),
      });
    }
  };

  return (
    <div className="customer-screen customer-feedback-screen">
      <ScreenHeader
        title={isReview ? 'Đánh giá đơn hàng' : 'Báo cáo sự cố'}
        subtitle={`${order.orderCode} · ${order.merchantName}`}
        onBack={onBack}
      />

      <section className="customer-feedback-card">
        <div className="customer-feedback-icon">
          {isReview ? <Sparkles size={32} /> : '🛟'}
        </div>

        <h1>
          {isReview
            ? 'Chất lượng túi thực phẩm thế nào?'
            : 'Bạn đang gặp vấn đề gì?'}
        </h1>

        <p>
          {isReview
            ? 'Đánh giá của bạn giúp cộng đồng chọn món ngon và giúp cửa hàng ngày càng hoàn thiện hơn.'
            : 'Thông tin sự cố sẽ được chuyển thẳng tới Ban quản trị Admin GoSavingFood để hỗ trợ bạn.'}
        </p>

        {isReview ? (
          <>
            {/* Star Rating Picker */}
            <div className="customer-rating-section">
              <div className="customer-rating-picker" role="radiogroup" aria-label="Đánh giá sao">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    type="button"
                    key={value}
                    className={`customer-star-btn ${value <= rating ? 'is-active' : ''}`}
                    onClick={() => setRating(value)}
                    aria-label={`${value} sao`}
                  >
                    <Star
                      size={34}
                      fill={value <= rating ? '#e5a000' : 'none'}
                      stroke={value <= rating ? '#e5a000' : '#c8cfca'}
                    />
                  </button>
                ))}
              </div>
              <div className="customer-rating-hint">
                <span>{RATING_DESCRIPTIONS[rating]}</span>
              </div>
            </div>

            {/* Quick Impression Tags */}
            <div className="customer-feedback-tags-section">
              <span className="customer-feedback-tags-title">
                Bạn ấn tượng nhất điều gì?
              </span>
              <div className="customer-feedback-tags-grid">
                {REVIEW_TAGS.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      type="button"
                      key={tag}
                      className={`customer-feedback-tag ${isSelected ? 'is-active' : ''}`}
                      onClick={() => toggleTag(tag)}
                    >
                      {isSelected && <Check size={12} />}
                      <span>{tag}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Detailed Comment */}
            <label className="customer-field-label">
              <span>Nhận xét chi tiết</span>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                placeholder="Hãy chia sẻ cảm nhận thực tế về món ăn, hương vị và trải nghiệm nhận món của bạn..."
              />
            </label>
          </>
        ) : (
          <>
            <div className="customer-field-label">
              <span>Loại sự cố</span>
              <div className="customer-issue-grid customer-issue-grid--vertical">
                {REPORT_ISSUES.map((item) => (
                  <button
                    type="button"
                    key={item}
                    className={selectedIssue === item ? 'is-active' : ''}
                    onClick={() => setSelectedIssue(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <label className="customer-field-label">
              <span>Mô tả chi tiết sự cố</span>
              <textarea
                value={reportDetail}
                onChange={(e) => setReportDetail(e.target.value)}
                rows={4}
                placeholder="Mô tả cụ thể sự cố bạn gặp phải tại cửa hàng để Admin giải quyết và hoàn tiền cho bạn..."
              />
            </label>
          </>
        )}

        <div className="customer-feedback-actions">
          <Button
            fullWidth
            size="lg"
            variant="primary"
            onClick={handleFormSubmit}
          >
            <Send size={16} />
            {isReview ? 'Gửi đánh giá' : 'Gửi báo cáo sự cố'}
          </Button>
        </div>
      </section>
    </div>
  );
}
