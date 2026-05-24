import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

// Service Worker 自动更新：检测到新版本直接激活，无需手动清缓存
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((reg) => {
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // 新 SW 已就绪，通知用户刷新
            const toast = document.createElement('div');
            toast.style.cssText =
              'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:9999;' +
              'background:#6366f1;color:#fff;padding:12px 20px;border-radius:999px;' +
              'font-size:14px;font-weight:600;cursor:pointer;box-shadow:0 4px 20px rgba(99,102,241,0.4);';
            toast.textContent = '✨ 新版本已就绪，点击刷新';
            toast.onclick = () => {
              newWorker.postMessage({ type: 'SKIP_WAITING' });
              window.location.reload();
            };
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 8000);
          }
        });
      });
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
