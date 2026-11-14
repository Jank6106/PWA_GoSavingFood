import React from 'react';
import {
  Banknote,
  Clock,
  MapPin,
  Sparkles,
  Users,
  UtensilsCrossed,
} from 'lucide-react';
import type { FinderConstraints } from '../../../shared/types/finder.types';
import { CATEGORY_LABELS } from '../constants';

interface FinderCriteriaChipsProps {
  constraints: FinderConstraints;
}

export const FinderCriteriaChips: React.FC<FinderCriteriaChipsProps> = ({ constraints }) => {
  const hasConstraints =
    constraints.people > 1 ||
    constraints.maxBudget !== null ||
    constraints.category !== null ||
    constraints.area !== null ||
    constraints.pickupBefore !== null ||
    (constraints.preferences && constraints.preferences.length > 0);

  if (!hasConstraints) {
    return null;
  }

  return (
    <section className="gsf-finder-criteria" aria-label="Tiêu chí tìm kiếm đã nhận diện">
      <h3 className="gsf-finder-criteria-title">Tiêu chí đã nhận diện:</h3>
      <div className="gsf-finder-criteria-list">
        {/* Số người */}
        <span className="gsf-finder-chip" title="Số lượng người ăn">
          <Users size={14} className="gsf-finder-chip-icon" aria-hidden="true" />
          <span>{constraints.people > 1 ? `${constraints.people} người` : '1 người'}</span>
        </span>

        {/* Ngân sách tối đa cho cả nhóm */}
        {constraints.maxBudget !== null && (
          <span className="gsf-finder-chip gsf-finder-chip--budget" title="Ngân sách tối đa cho cả nhóm">
            <Banknote size={14} className="gsf-finder-chip-icon" aria-hidden="true" />
            <span>
              Tối đa {constraints.maxBudget.toLocaleString('vi-VN')}đ (cả nhóm{constraints.people > 1 ? ` ${constraints.people} người` : ''})
            </span>
          </span>
        )}

        {/* Danh mục món */}
        {constraints.category && (
          <span className="gsf-finder-chip" title="Loại món ăn">
            <UtensilsCrossed size={14} className="gsf-finder-chip-icon" aria-hidden="true" />
            <span>{CATEGORY_LABELS[constraints.category] || constraints.category}</span>
          </span>
        )}

        {/* Khu vực */}
        {constraints.area && (
          <span className="gsf-finder-chip" title="Khu vực tìm kiếm">
            <MapPin size={14} className="gsf-finder-chip-icon" aria-hidden="true" />
            <span>Khu vực: {constraints.area}</span>
          </span>
        )}

        {/* Khung giờ nhận trước */}
        {constraints.pickupBefore && (
          <span className="gsf-finder-chip" title="Khung giờ nhận trước">
            <Clock size={14} className="gsf-finder-chip-icon" aria-hidden="true" />
            <span>Nhận trước {constraints.pickupBefore}</span>
          </span>
        )}

        {/* Sở thích / chế độ ăn */}
        {constraints.preferences?.map((pref, idx) => (
          <span key={idx} className="gsf-finder-chip gsf-finder-chip--pref" title="Sở thích / Yêu cầu">
            <Sparkles size={14} className="gsf-finder-chip-icon" aria-hidden="true" />
            <span>{pref}</span>
          </span>
        ))}
      </div>
    </section>
  );
};
