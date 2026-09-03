import React from 'react';
import { MapPin, Smartphone } from 'lucide-react';
import { Badge } from '@gosavingfood/ui';

interface AppHeaderProps {
  isStandalone?: boolean;
  onInstallClick?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  isStandalone = false,
  onInstallClick,
}) => {
  return (
    <header className="customer-header">
      <div className="customer-header-inner">
        <div className="customer-brand">
          <div className="customer-logo-badge">
            <span className="customer-logo-icon" aria-hidden="true">🌱</span>
          </div>
          <div>
            <h1 className="customer-brand-title">GoSavingFood</h1>
            <div className="customer-location">
              <MapPin size={13} strokeWidth={2.5} />
              <span>Quận 1, TP. Hồ Chí Minh</span>
            </div>
          </div>
        </div>

        <div className="customer-header-actions">
          {isStandalone ? (
            <Badge variant="primary">
              <Smartphone size={12} strokeWidth={2} />
              PWA App
            </Badge>
          ) : (
            onInstallClick && (
              <button
                type="button"
                className="customer-install-btn"
                onClick={onInstallClick}
                aria-label="Cài đặt App vào màn hình chính"
              >
                📲 Tải App
              </button>
            )
          )}
        </div>
      </div>
    </header>
  );
};
