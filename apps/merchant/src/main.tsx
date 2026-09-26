import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@gosavingfood/ui/tokens.css'
import '@gosavingfood/ui/components.css'
import './index.css'
import App from './App.tsx'

// Chỉ bật PWA cache ở production; development phải luôn dùng module Vite mới nhất.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    if (import.meta.env.PROD) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('Merchant PWA ServiceWorker đăng ký thành công:', registration.scope);
        })
        .catch((error) => {
          console.error('Merchant PWA ServiceWorker đăng ký thất bại:', error);
        });
      return;
    }

    void navigator.serviceWorker.getRegistrations().then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())));
    void caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('gsf-merchant-')).map((key) => caches.delete(key))));
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
