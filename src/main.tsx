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
      // once everything the game needs has been loaded, hand the URL list to the worker so a later offline start works
      void navigator.serviceWorker.ready.then((r) => {
        window.setTimeout(() => {
          const urls = new Set<string>([location.href.split('#')[0]]);
          for (const e of performance.getEntriesByType('resource')) if (e.name.startsWith(location.origin)) urls.add(e.name);
          r.active?.postMessage({ type: 'PRECACHE', urls: Array.from(urls) });
        }, 2500);
      });
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
