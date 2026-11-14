import { useCallback, useRef, useState } from 'react';
import { AI_CATEGORY_TO_FORM, analyzeBagPhoto, prepareBagPhoto, warmUpAiEndpoint } from '../services/ai.service';
import { fetchStoreProfile, getCachedStoreProfile } from '../services/store.service';
import { getVnDateString } from '../utils/bagTiming';
import {
  computeSalePrice,
  suggestDiscount,
  suggestPickupWindow,
  type DiscountSuggestion,
} from '../utils/discountSuggestion';

/** Bản nháp đã sẵn sàng để đổ vào form tạo túi (BagEditorModal). */
export interface AiFormDraft {
  name: string;
  category: string;
  description: string;
  bagType: 'daily' | 'shelf_life';
  expiryDate: string;
  pickupTimeStart: string;
  pickupTimeEnd: string;
  originalPrice: number | null;
  salePrice: number | null;
  discount: DiscountSuggestion;
  imageBlob: Blob;
  previewUrl: string;
}

export type AiDraftStatus = 'idle' | 'analyzing' | 'done' | 'error';

/**
 * AI Đăng Hàng (bổ sung, không thay thế luồng nhập tay):
 * ảnh -> AI đọc (tên, loại, mô tả, hạn dùng, giá gốc ước lượng) -> gợi ý % giảm theo giờ đóng cửa.
 * Không ghi DB: chủ quán vẫn bấm "Tạo túi hàng" để đi qua luồng `addBag` cũ.
 */
export function useAiBagDraft(storeId?: string) {
  const [status, setStatus] = useState<AiDraftStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [lastDraft, setLastDraft] = useState<AiFormDraft | null>(null);
  const requestIdRef = useRef(0);

  const resolveClosingTime = useCallback(async (): Promise<string | undefined> => {
    if (!storeId) return undefined;
    const cached = getCachedStoreProfile(storeId);
    if (cached?.closingHours) return cached.closingHours;
    const fresh = await fetchStoreProfile(storeId).catch(() => null);
    return fresh?.closingHours;
  }, [storeId]);

  const analyze = useCallback(
    async (file: File): Promise<AiFormDraft | null> => {
      const requestId = ++requestIdRef.current;
      setStatus('analyzing');
      setError(null);

      try {
        const [photo, closingTime] = await Promise.all([prepareBagPhoto(file), resolveClosingTime()]);
        const ai = await analyzeBagPhoto(photo.aiBlob);
        if (requestId !== requestIdRef.current) return null; // đã bị huỷ / chụp ảnh khác

        const discount = suggestDiscount(closingTime);
        const pickup = suggestPickupWindow(closingTime);
        // Form chỉ cho chọn hạn dùng từ ngày mai trở đi -> hạn hôm nay/đã qua thì coi là hàng trong ngày
        const today = getVnDateString();
        const useShelfLife = Boolean(ai.expiryDate && ai.expiryDate > today);
        const originalPrice = ai.estimatedOriginalPrice;

        const draft: AiFormDraft = {
          name: ai.name,
          category: AI_CATEGORY_TO_FORM[ai.category] || AI_CATEGORY_TO_FORM.other,
          description: ai.description,
          bagType: useShelfLife ? 'shelf_life' : 'daily',
          expiryDate: useShelfLife ? (ai.expiryDate as string) : '',
          pickupTimeStart: pickup.start,
          pickupTimeEnd: pickup.end,
          originalPrice,
          salePrice: originalPrice ? computeSalePrice(originalPrice, discount.percent) : null,
          discount,
          imageBlob: photo.formBlob,
          previewUrl: photo.previewUrl,
        };
        setLastDraft(draft);
        setStatus('done');
        return draft;
      } catch (err: unknown) {
        if (requestId !== requestIdRef.current) return null;
        setError(err instanceof Error && err.message ? err.message : 'AI chưa phân tích được ảnh, bạn có thể nhập tay.');
        setStatus('error');
        return null;
      }
    },
    [resolveClosingTime]
  );

  const reset = useCallback(() => {
    requestIdRef.current++;
    setStatus('idle');
    setError(null);
    setLastDraft(null);
  }, []);

  const warmUp = useCallback(() => warmUpAiEndpoint(), []);

  return { status, error, lastDraft, analyze, reset, warmUp };
}
