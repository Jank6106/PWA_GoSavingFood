import { Search } from 'lucide-react';
import type { ReactNode } from 'react';

interface SearchFieldProps {
  value: string;
  placeholder: string;
  autoFocus?: boolean;
  trailing?: ReactNode;
  onChange: (value: string) => void;
}

export function SearchField({ value, placeholder, autoFocus, trailing, onChange }: SearchFieldProps) {
  return (
    <div className="customer-search-box">
      <Search size={19} />
      <input autoFocus={autoFocus} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
      {trailing}
    </div>
  );
}
