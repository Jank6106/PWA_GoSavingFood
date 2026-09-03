import React from 'react';
import { Button } from '../Button/Button';

export interface ErrorStateProps {
  icon?: React.ReactNode;
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryText?: string;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  icon,
  title = 'Đã xảy ra lỗi',
  message = 'Không thể tải dữ liệu vào lúc này. Vui lòng kiểm tra lại kết nối mạng hoặc thử lại sau.',
  onRetry,
  retryText = 'Thử lại ngay',
  className = '',
}) => {
  return (
    <div className={`gsf-state-container ${className}`.trim()} role="alert">
      <div className="gsf-state-icon gsf-state-icon--error">
        {icon || (
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        )}
      </div>
      <h3 className="gsf-state-title">{title}</h3>
      {message && <p className="gsf-state-description">{message}</p>}
      {onRetry && (
        <Button variant="primary" size="md" onClick={onRetry}>
          {retryText}
        </Button>
      )}
    </div>
  );
};
