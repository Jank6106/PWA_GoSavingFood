import { useState } from 'react';
import { Button } from '@gosavingfood/ui';
import { ScreenHeader } from '../../../shared/components';
import type { Order } from '../../../shared/types/customer.types';

interface OrderFeedbackPageProps { mode: 'review' | 'report'; order: Order; onBack: () => void; onSubmit: () => void; }
const issues = ['Thiếu món', 'Chất lượng món', 'Cửa hàng đóng cửa', 'Khác'];

export function OrderFeedbackPage({ mode, order, onBack, onSubmit }: OrderFeedbackPageProps) {
  const [rating, setRating] = useState(5);
  const [issue, setIssue] = useState(issues[0]);
  const [comment, setComment] = useState('');
  const isReview = mode === 'review';
  return <div className="customer-screen"><ScreenHeader title={isReview ? 'Đánh giá đơn hàng' : 'Báo cáo sự cố'} subtitle={`${order.orderCode} · ${order.merchantName}`} onBack={onBack} /><section className="customer-feedback-card"><div className="customer-feedback-icon">{isReview ? '⭐' : '🛟'}</div><h1>{isReview ? 'Trải nghiệm của bạn thế nào?' : 'Bạn đang gặp vấn đề gì?'}</h1><p>{isReview ? 'Đánh giá giúp cửa hàng phục vụ tốt hơn.' : 'Thông tin sẽ được gửi tới bộ phận hỗ trợ.'}</p>{isReview ? <div className="customer-rating-picker">{[1, 2, 3, 4, 5].map((value) => <button type="button" key={value} className={value <= rating ? 'is-active' : ''} onClick={() => setRating(value)}>★</button>)}</div> : <div className="customer-issue-grid">{issues.map((item) => <button type="button" key={item} className={issue === item ? 'is-active' : ''} onClick={() => setIssue(item)}>{item}</button>)}</div>}<label className="customer-field-label"><span>{isReview ? 'Nhận xét' : 'Mô tả chi tiết'}</span><textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder={isReview ? 'Chia sẻ điều bạn thích...' : 'Mô tả sự cố để chúng tôi hỗ trợ...'} /></label><Button fullWidth size="lg" onClick={onSubmit}>{isReview ? 'Gửi đánh giá' : 'Gửi báo cáo'}</Button></section></div>;
}
