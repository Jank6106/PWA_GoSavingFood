import { useEffect, useState } from 'react';
import { Crosshair, MapPin } from 'lucide-react';
import { Button } from '@gosavingfood/ui';
import { ScreenHeader, SearchField } from '../../../shared/components';
import { customerService } from '../../../services/customer.service';
import type { LocationSuggestion } from '../../../shared/types/customer.types';

interface SelectLocationPageProps { currentLocation: string; onBack: () => void; onSelect: (location: string) => void; }

export function SelectLocationPage({ currentLocation, onBack, onSelect }: SelectLocationPageProps) {
  const [query, setQuery] = useState('');
  const [locations, setLocations] = useState<LocationSuggestion[]>([]);
  const [selected, setSelected] = useState(currentLocation);
  useEffect(() => {
    let active = true;
    customerService.searchLocations(query).then((items) => active && setLocations(items));
    return () => { active = false; };
  }, [query]);
  return <div className="customer-screen customer-location-screen"><ScreenHeader title="Chọn vị trí" subtitle="Tìm món ngon ở gần bạn" onBack={onBack} /><SearchField value={query} onChange={setQuery} placeholder="Tìm địa điểm..." /><button type="button" className="customer-gps-button" onClick={() => setSelected('Vị trí hiện tại, Quận 1')}><Crosshair size={19} /><span><strong>Dùng vị trí hiện tại</strong><small>Cho phép trình duyệt truy cập GPS</small></span></button><div className="customer-location-map"><div className="customer-map-grid" /><MapPin size={36} /></div><div className="customer-location-results">{locations.map((location) => <button type="button" key={location.id} className={selected === location.name ? 'is-selected' : ''} onClick={() => setSelected(location.name)}><MapPin size={18} /><span><strong>{location.name}</strong><small>{location.address}</small></span><em>{location.distance}</em></button>)}</div><div className="customer-sticky-action"><Button fullWidth size="lg" onClick={() => onSelect(selected)}>Xác nhận vị trí</Button></div></div>;
}
