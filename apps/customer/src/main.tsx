import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@gosavingfood/ui/tokens.css'
import '@gosavingfood/ui/components.css'
import './index.css'
import App from './App.tsx'

// Kích hoạt quyền lưu trữ bền vững của PWA (Persistent Storage)
if (typeof window !== 'undefined' && 'storage' in navigator && navigator.storage?.persist) {
  navigator.storage.persist().catch(() => {});
}

// Khóa cử chỉ phóng to (pinch-to-zoom) trên mobile để đảm bảo trải nghiệm chuẩn App PWA, giữ nguyên thao tác cuộn/vuốt
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const isZoomAllowed = (target: EventTarget | null): boolean => {
    return Boolean((target as HTMLElement | null)?.closest?.('.mapboxgl-map, [data-allow-zoom="true"]'));
  };

  document.addEventListener(
    'gesturestart',
    (e) => {
      if (!isZoomAllowed(e.target)) {
        e.preventDefault();
      }
    },
    { passive: false }
  );

  document.addEventListener(
    'gesturechange',
    (e) => {
      if (!isZoomAllowed(e.target)) {
        e.preventDefault();
      }
    },
    { passive: false }
  );

  document.addEventListener(
    'touchmove',
    (e) => {
      if (e.touches && e.touches.length > 1 && !isZoomAllowed(e.target)) {
        e.preventDefault();
      }
    },
    { passive: false }
  );
}

// Đăng ký Service Worker cho PWA (chỉ kích hoạt ở production)
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      const swUrl = `${import.meta.env.BASE_URL}sw.js`;
      navigator.serviceWorker
        .register(swUrl, { scope: import.meta.env.BASE_URL })
        .then((registration) => {
          console.log('Customer PWA ServiceWorker đăng ký thành công:', registration.scope);
        })
        .catch((error) => {
          console.error('Customer PWA ServiceWorker đăng ký thất bại:', error);
        });
    });
  } else {
    // Trong môi trường dev localhost: Hủy đăng ký và xóa cache để luôn load code mới nhất
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister();
      }
    });
    if ('caches' in window) {
      caches.keys().then((keys) => {
        for (const key of keys) {
          caches.delete(key);
        }
      });
    }
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

