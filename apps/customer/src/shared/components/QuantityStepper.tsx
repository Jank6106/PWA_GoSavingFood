import { Minus, Plus } from 'lucide-react';

interface QuantityStepperProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}

export function QuantityStepper({ value, min = 0, max = Number.POSITIVE_INFINITY, onChange }: QuantityStepperProps) {
  return (
    <div className="customer-stepper">
      <button type="button" disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))} aria-label="Giảm số lượng"><Minus size={15} /></button>
      <strong>{value}</strong>
      <button type="button" disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))} aria-label="Tăng số lượng"><Plus size={15} /></button>
    </div>
  );
}
