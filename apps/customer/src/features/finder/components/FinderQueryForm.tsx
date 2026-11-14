import React from 'react';
import { Loader2, Search, Sparkles, X } from 'lucide-react';
import { Button } from '@gosavingfood/ui';
import { EXAMPLE_QUERIES } from '../constants';

interface FinderQueryFormProps {
  query: string;
  onQueryChange: (q: string) => void;
  onSubmit: (e?: React.FormEvent) => void;
  onSelectExample: (example: string) => void;
  isLoading: boolean;
}

export const FinderQueryForm: React.FC<FinderQueryFormProps> = ({
  query,
  onQueryChange,
  onSubmit,
  onSelectExample,
  isLoading,
}) => {
  const isOverLimit = query.length > 400;
  const isSubmitDisabled = isLoading || !query.trim() || isOverLimit;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Nhấn Enter mà không giữ Shift thì submit form
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isSubmitDisabled) {
        onSubmit();
      }
    }
  };

  const handleClear = () => {
    onQueryChange('');
  };

  return (
    <form className="gsf-finder-form" onSubmit={onSubmit} aria-label="Tìm kiếm món ăn theo nhu cầu">
      {/* Label rõ ràng cho input tự nhiên */}
      <div className="gsf-finder-form-header">
        <label htmlFor="gsf-finder-textarea" className="gsf-finder-form-label">
          Mô tả nhu cầu của bạn
        </label>
        <span
          id="gsf-finder-char-counter"
          className={`gsf-finder-char-counter ${isOverLimit ? 'is-error' : query.length > 350 ? 'is-warning' : ''}`}
          aria-live="polite"
        >
          {query.length}/400 ký tự
        </span>
      </div>

      <p className="gsf-finder-form-sublabel">
        Nhập số người, ngân sách, khu vực, khẩu vị hoặc giờ nhận bạn mong muốn.
      </p>

      {/* Vùng nhập liệu Textarea: Không cắt cụt âm thầm bằng hard maxLength, có phản hồi rõ ràng khi vượt quá 400 ký tự */}
      <div className="gsf-finder-textarea-wrapper">
        <textarea
          id="gsf-finder-textarea"
          className={`gsf-finder-textarea ${isOverLimit ? 'is-invalid' : ''}`}
          rows={3}
          value={query}
          disabled={isLoading}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ví dụ: Tối nay 2 người, 100k, không ăn cay quanh Dịch Vọng..."
          aria-describedby="gsf-finder-char-counter"
          aria-invalid={isOverLimit}
        />
        {query.length > 0 && !isLoading && (
          <button
            type="button"
            className="gsf-finder-clear-btn"
            onClick={handleClear}
            aria-label="Xóa nội dung tìm kiếm"
            title="Xóa nội dung"
          >
            <X size={16} aria-hidden="true" />
          </button>
        )}
      </div>

      {isOverLimit && (
        <p className="gsf-finder-validation-error" role="alert">
          Yêu cầu tìm kiếm đã vượt quá giới hạn 400 ký tự ({query.length}/400). Vui lòng rút gọn nội dung để tiếp tục.
        </p>
      )}

      {/* Nút gửi tìm kiếm */}
      <div className="gsf-finder-submit-row">
        <Button
          type="submit"
          variant="primary"
          size="md"
          fullWidth
          disabled={isSubmitDisabled}
          isLoading={isLoading}
          leftIcon={isLoading ? <Loader2 size={18} className="gsf-finder-spin" /> : <Search size={18} />}
        >
          {isLoading ? 'Đang phân tích và tìm kiếm...' : 'Tìm món phù hợp'}
        </Button>
      </div>

      {/* Gợi ý mẫu từ biên bản cuộc họp */}
      <div className="gsf-finder-examples">
        <div className="gsf-finder-examples-title">
          <Sparkles size={14} className="gsf-finder-examples-icon" aria-hidden="true" />
          <span>Gợi ý mẫu (bấm để thử ngay):</span>
        </div>
        <div className="gsf-finder-examples-chips">
          {EXAMPLE_QUERIES.map((example, idx) => (
            <button
              key={idx}
              type="button"
              className="gsf-finder-example-chip"
              disabled={isLoading}
              onClick={() => onSelectExample(example)}
              aria-label={`Tìm kiếm ví dụ: ${example}`}
            >
              <span>{example}</span>
            </button>
          ))}
        </div>
      </div>
    </form>
  );
};
