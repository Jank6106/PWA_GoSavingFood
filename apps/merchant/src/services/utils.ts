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

/**
 * Nén ảnh tự động qua HTML5 Canvas trước khi gửi lên cơ sở dữ liệu.
 * Giảm dung lượng từ 5MB-10MB xuống ~30KB-50KB để tối ưu tốc độ load app 100 lần.
 */
export const compressImageFile = (file?: File, maxWidth = 800, quality = 0.75): Promise<string | null> => {
  if (!file) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result;
      if (typeof src !== 'string') return resolve(null);
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth || height > maxWidth) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxWidth) / height);
            height = maxWidth;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(src);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(src);
      img.src = src;
    };
    reader.onerror = () => reject(new Error('Không thể đọc ảnh.'));
    reader.readAsDataURL(file);
  });
};
