import { getVnDateString } from './bagTiming';

/** Reject expired labels before applying a draft; today's stock remains daily. */
export function resolveDraftExpiry(expiryDate: string | null, today = getVnDateString()): {
  bagType: 'daily' | 'shelf_life';
  expiryDate: string;
} {
  if (expiryDate && expiryDate < today) {
    throw new Error('Hạn sử dụng đọc được trong ảnh đã qua. Vui lòng kiểm tra sản phẩm trước khi đăng bán.');
  }
  return expiryDate && expiryDate > today
    ? { bagType: 'shelf_life', expiryDate }
    : { bagType: 'daily', expiryDate: '' };
}
