import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface FinderWarningsProps {
  warnings?: string[];
}

export const FinderWarnings: React.FC<FinderWarningsProps> = ({ warnings }) => {
  if (!warnings || warnings.length === 0) {
    return null;
  }

  return (
    <div className="gsf-finder-warnings-container" role="region" aria-label="Lưu ý khi tìm kiếm">
      <div className="gsf-finder-warning-box gsf-finder-warning-box--custom" role="alert">
        <div className="gsf-finder-warning-header">
          <AlertTriangle size={16} className="gsf-finder-warning-icon" aria-hidden="true" />
          <h4 className="gsf-finder-warning-title">Lưu ý khi tìm kiếm:</h4>
        </div>
        <ul className="gsf-finder-warning-list">
          {warnings.map((warn, idx) => (
            <li key={idx} className="gsf-finder-warning-item">
              {warn}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
