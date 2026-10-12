import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import './styles/global.css';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).then((reg) => {
      reg.addEventListener('updatefound', () => {
        const w = reg.installing;
        w?.addEventListener('statechange', () => {
          if (w.state === 'installed' && navigator.serviceWorker.controller) window.dispatchEvent(new CustomEvent('pl-update-ready', { detail: reg }));
        });
      });
    }).catch((e) => console.warn('SW registration failed', e));
  });
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  (window as unknown as { __install?: Event }).__install = e;
});
