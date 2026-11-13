import { errorMessage } from './errors';
/**
 * Helper nén ảnh đại diện phía client (Client-side Image Optimization)
 * - Tự động crop tâm (Center Crop) vuông 1:1
 * - Scale chuẩn 400x400 px
 * - Xuất định dạng WebP (fallback JPEG) với quality: 0.8
 * - Dung lượng nén cực nhẹ (~30KB - 80KB, < 100KB)
 */

export interface CompressedAvatarResult {
  blob: Blob;
  dataUrl: string;
  contentType: 'image/webp' | 'image/jpeg';
  width: number;
  height: number;
  sizeBytes: number;
}

export interface CompressAvatarOptions {
  size?: number;
  quality?: number;
}

export function compressAvatarFile(
  file: File,
  options: CompressAvatarOptions = {}
): Promise<CompressedAvatarResult> {
  const { size = 400, quality = 0.8 } = options;

  return new Promise((resolve, reject) => {
    // 1. Kiểm tra định dạng đầu vào cơ bản
    if (!file.type.startsWith('image/')) {
      return reject(new Error('Vui lòng chọn tệp hình ảnh hợp lệ (PNG, JPG, WebP, ...).'));
    }

    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error('Không thể đọc file hình ảnh từ thiết bị.'));
    };

    reader.onload = () => {
      const src = reader.result;
      if (typeof src !== 'string') {
        return reject(new Error('Dữ liệu ảnh không hợp lệ.'));
      }

      const img = new Image();

      img.onerror = () => {
        reject(new Error('Không thể dựng hình ảnh để xử lý nén.'));
      };

      img.onload = () => {
        try {
          const originalWidth = img.naturalWidth || img.width;
          const originalHeight = img.naturalHeight || img.height;

          if (!originalWidth || !originalHeight) {
            return reject(new Error('Kích thước ảnh không xác định.'));
          }

          // 2. Tính toán Center Crop (crop tâm vuông 1:1)
          const minSide = Math.min(originalWidth, originalHeight);
          const sx = (originalWidth - minSide) / 2;
          const sy = (originalHeight - minSide) / 2;

          // 3. Scale về chuẩn 400x400 px (hoặc giữ nguyên nếu ảnh nhỏ hơn 400px)
          const targetDimension = Math.min(size, Math.max(120, minSide));

          const canvas = document.createElement('canvas');
          canvas.width = targetDimension;
          canvas.height = targetDimension;

          const ctx = canvas.getContext('2d', { alpha: false });
          if (!ctx) {
            return reject(new Error('Trình duyệt không hỗ trợ Canvas 2D.'));
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Vẽ nền trắng phòng trường hợp ảnh PNG trong suốt xuất sang JPEG
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, targetDimension, targetDimension);

          // Cắt tâm vuông và vẽ scale vào canvas
          ctx.drawImage(
            img,
            sx,
            sy,
            minSide,
            minSide,
            0,
            0,
            targetDimension,
            targetDimension
          );

          // 4. Xuất WebP (fallback JPEG nếu trình duyệt không hỗ trợ WebP export)
          const tryExportWebp = () => {
            canvas.toBlob(
              (blob) => {
                if (blob && blob.size > 0 && blob.type.includes('webp')) {
                  const dataUrl = canvas.toDataURL('image/webp', quality);
                  resolve({
                    blob,
                    dataUrl,
                    contentType: 'image/webp',
                    width: targetDimension,
                    height: targetDimension,
                    sizeBytes: blob.size,
                  });
                } else {
                  // Fallback sang JPEG
                  fallbackJpeg();
                }
              },
              'image/webp',
              quality
            );
          };

          const fallbackJpeg = () => {
            canvas.toBlob(
              (jpegBlob) => {
                if (!jpegBlob) {
                  return reject(new Error('Lỗi xuất file ảnh đã nén.'));
                }
                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                resolve({
                  blob: jpegBlob,
                  dataUrl,
                  contentType: 'image/jpeg',
                  width: targetDimension,
                  height: targetDimension,
                  sizeBytes: jpegBlob.size,
                });
              },
              'image/jpeg',
              quality
            );
          };

          tryExportWebp();
        } catch (err: unknown) {
          reject(new Error(errorMessage(err) || 'Lỗi trong quá trình nén ảnh.', { cause: err }));
        }
      };

      img.src = src;
    };

    reader.readAsDataURL(file);
  });
}
