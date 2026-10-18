import React from 'react';
import { Leaf, Wind, Sparkles, Scale, Info } from 'lucide-react';

interface ESGImpactSectionProps {
  foodSavedKg: number;
  co2PreventedKg: number;
  completedBags: number;
  timeRangeLabel?: string;
}

export const ESGImpactSection: React.FC<ESGImpactSectionProps> = ({
  foodSavedKg,
  co2PreventedKg,
  completedBags,
  timeRangeLabel = 'Tổng tích lũy',
}) => {
  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #D9D5CB',
        borderRadius: '16px',
        padding: '22px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        boxShadow: '0 2px 10px rgba(25, 59, 44, 0.02)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Leaf size={18} color="#166B4A" />
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#193B2C' }}>
            Tác Động Môi Trường & Bền Vững (Yindii ESG Impact Model)
          </h3>
        </div>
        <span
          style={{
            padding: '3px 8px',
            borderRadius: '6px',
            background: '#EEF4E4',
            color: '#166B4A',
            fontSize: '11px',
            fontWeight: '700',
            border: '1px solid #D8ED9B',
          }}
        >
          {timeRangeLabel}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        {/* Metric 1: Food Saved */}
        <div
          style={{
            background: 'linear-gradient(135deg, #166B4A 0%, #193B2C 100%)',
            borderRadius: '14px',
            padding: '18px',
            color: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '12px', color: '#D8ED9B', fontWeight: '700', textTransform: 'uppercase' }}>
              Thực phẩm giải cứu
            </span>
            <Scale size={18} color="#D8ED9B" />
          </div>
          <div style={{ margin: '12px 0 6px 0' }}>
            <span style={{ fontSize: '28px', fontWeight: '800', letterSpacing: '-0.5px' }}>
              {Number(foodSavedKg).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}
            </span>
            <span style={{ fontSize: '14px', fontWeight: '600', marginLeft: '6px', color: '#D8ED9B' }}>kg</span>
          </div>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.75)' }}>
            Từ {completedBags.toLocaleString()} túi đồ ăn đã giao nhận
          </span>
        </div>

        {/* Metric 2: CO2 Prevented */}
        <div
          style={{
            background: 'linear-gradient(135deg, #193B2C 0%, #166B4A 100%)',
            borderRadius: '14px',
            padding: '18px',
            color: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            border: '1px solid rgba(216, 237, 155, 0.2)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '12px', color: '#D8ED9B', fontWeight: '700', textTransform: 'uppercase' }}>
              CO₂e Giảm thiểu
            </span>
            <Wind size={18} color="#D8ED9B" />
          </div>
          <div style={{ margin: '12px 0 6px 0' }}>
            <span style={{ fontSize: '28px', fontWeight: '800', letterSpacing: '-0.5px' }}>
              {Number(co2PreventedKg).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}
            </span>
            <span style={{ fontSize: '14px', fontWeight: '600', marginLeft: '6px', color: '#D8ED9B' }}>kg CO₂e</span>
          </div>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.75)' }}>
            Tránh phát thải từ phân hủy hữu cơ bãi rác
          </span>
        </div>

        {/* Metric 3: Equivalent Impact */}
        <div
          style={{
            background: '#F4F1E8',
            border: '1px solid #D9D5CB',
            borderRadius: '14px',
            padding: '18px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '12px', color: '#166B4A', fontWeight: '700', textTransform: 'uppercase' }}>
              Quy đổi giá trị xã hội
            </span>
            <Sparkles size={18} color="#166B4A" />
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#193B2C' }}>
              ~{Math.round(foodSavedKg * 2.2).toLocaleString()} bữa ăn
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#526458', lineHeight: '1.4' }}>
              Được bảo toàn dinh dưỡng, tương đương lượng hấp thụ của {Math.round(co2PreventedKg / 22)} cây xanh/năm.
            </p>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '10.5px',
              color: '#7D8E82',
              marginTop: '6px',
            }}
          >
            <Info size={11} /> Hệ số quy đổi: 1 túi = 1.0 kg thực phẩm = 2.5 kg CO₂e (ước tính Yindii/WRAP)
          </div>
        </div>
      </div>
    </div>
  );
};
