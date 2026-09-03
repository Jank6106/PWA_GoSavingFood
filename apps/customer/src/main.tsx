import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@gosavingfood/ui/tokens.css'
import '@gosavingfood/ui/components.css'
import './index.css'
import App from './App.tsx'

// Đăng ký Service Worker cho PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('Customer PWA ServiceWorker đăng ký thành công:', registration.scope);
      })
      .catch((error) => {
        console.error('Customer PWA ServiceWorker đăng ký thất bại:', error);
      });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

