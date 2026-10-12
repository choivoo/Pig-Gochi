// 앱 셸 캐시 (오프라인 플레이). 버전을 올리면 캐시가 갱신된다.
const VER = 'eraser-rpg-v1.0.0';
const SHELL = ['./', 'index.html', 'style.css', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png',
  'js/main.js', 'js/state.js', 'js/screens.js', 'js/modes.js', 'js/fight.js', 'js/battle.js', 'js/render.js', 'js/ai.js', 'js/combat.js',
  'js/physics.js', 'js/rpg.js', 'js/data.js', 'js/save.js', 'js/audio.js'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(VER).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VER).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return; // 폰트 등 외부는 네트워크에 맡긴다
  e.respondWith(
    fetch(e.request).then((r) => { const cp = r.clone(); caches.open(VER).then((c) => c.put(e.request, cp)); return r; })
      .catch(() => caches.match(e.request).then((m) => m || caches.match('index.html')))
  );
});
