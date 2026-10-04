export const delay = (ms = 260) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));
export const clone = <T,>(value: T): T => structuredClone(value);

/**
 * Tối ưu hóa ảnh với WebP tự động, kích thước và nén chất lượng cho Unsplash và CDN
 */
export const optimizeImageUrl = (url?: string | null, width = 400, quality = 75): string => {
  if (!url) return '';
  if (url.includes('images.unsplash.com')) {
    const base = url.split('?')[0];
    return `${base}?auto=format&fit=crop&w=${width}&q=${quality}`;
  }
  return url;
};
