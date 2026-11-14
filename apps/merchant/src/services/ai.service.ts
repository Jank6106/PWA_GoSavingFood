import { supabase } from './supabase';
import { compressImageToBlob } from './utils';

/**
 * AI Đăng Hàng: gửi ảnh món còn dư tới `/api/ai/analyze-bag` (Next.js, apps/web) để nhận bản nháp form.
 * Đi same-origin qua rewrite `/api/*` (Vercel) hoặc Vite proxy (dev) — không cần CORS.
 */

export type AiBagCategory = 'bakery' | 'beverage' | 'raw_food' | 'vegetarian' | 'other';

export interface AiBagDraft {
  name: string;
  category: AiBagCategory;
  description: string;
  expiryDate: string | null;
  estimatedOriginalPrice: number | null;
}

// Map về đúng các lựa chọn đang có trong dropdown `PRESET_BAG_CATEGORIES` của form
export const AI_CATEGORY_TO_FORM: Record<AiBagCategory, string> = {
  bakery: 'Bánh ngọt',
  beverage: 'Đồ uống',
  raw_food: 'Rau củ',
  vegetarian: 'Món Chay',
  other: 'Combo bất ngờ',
};

const AI_ENDPOINT = (import.meta.env.VITE_AI_API_BASE || '') + '/api/ai/analyze-bag';
const CLIENT_TIMEOUT_MS = 32_000; // > tổng ngân sách AI ở server (25s) để server kịp chuyển model dự phòng

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Không đọc được ảnh.'));
    reader.readAsDataURL(blob);
  });

/** Nén ảnh cho form (640px, giống luồng upload cũ) và cho AI (1024px để đọc được nhãn hạn dùng). */
export async function prepareBagPhoto(file: File) {
  const [forForm, forAi] = await Promise.all([
    compressImageToBlob(file, 640, 0.8),
    compressImageToBlob(file, 1024, 0.85),
  ]);
  if (!forForm || !forAi) throw new Error('Không xử lý được ảnh, vui lòng chụp lại.');
  return { formBlob: forForm.blob, previewUrl: forForm.previewUrl, aiBlob: forAi.blob };
}

/** Ping nhẹ để route AI (Next.js dev compile / Vercel cold start) sẵn sàng trước khi chủ quán chụp ảnh. */
let warmedUpAt = 0;
export function warmUpAiEndpoint(): void {
  if (Date.now() - warmedUpAt < 5 * 60_000) return;
  warmedUpAt = Date.now();
  void fetch(AI_ENDPOINT, { method: 'GET' }).catch(() => {
    warmedUpAt = 0;
  });
}

export async function analyzeBagPhoto(aiBlob: Blob): Promise<AiBagDraft> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.');

  const image = await blobToDataUrl(aiBlob);
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);

  try {
    const res = await fetch(AI_ENDPOINT, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ image }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success || !json.data) {
      throw new Error(json?.error || 'AI chưa phân tích được ảnh, bạn có thể nhập tay.');
    }
    return json.data as AiBagDraft;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('AI phản hồi quá lâu, bạn có thể thử lại hoặc nhập tay.', { cause: err });
    }
    throw err instanceof Error ? err : new Error('Lỗi kết nối AI.', { cause: err });
  } finally {
    window.clearTimeout(timer);
  }
}
