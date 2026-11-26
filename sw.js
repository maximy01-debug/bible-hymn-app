// 앱 화면은 미리 저장. 성경 자료·사진(data-v1)과 악보(hymns-v1)는
// 자료 파일(.bpk)을 불러올 때, 또는 PC에서 처음 열 때 저장해 두고 저장본을 먼저 씀.
const SHELL = 'shell-v3', DATA = 'data-v1', HYMNS = 'hymns-v1', FONTS = 'fonts-v1';
const FILES = ['./', 'index.html', 'style.css', 'app.js', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => ![SHELL, DATA, HYMNS, FONTS].includes(k)).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
const cacheFirst = (name, req, opaqueOk) => caches.open(name).then(async c => {
  const hit = await c.match(req, { ignoreSearch: true }); if (hit) return hit;
  const r = await fetch(req); if (r.ok || (opaqueOk && r.type === 'opaque')) c.put(req, r.clone()); return r;
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') { e.respondWith(cacheFirst(FONTS, e.request, true)); return; }
  if (url.origin !== location.origin) return;
  if (url.pathname.includes('/hymns/')) { e.respondWith(cacheFirst(HYMNS, e.request)); return; }
  if (url.pathname.includes('/data/') || url.pathname.includes('/img/')) { e.respondWith(cacheFirst(DATA, e.request)); return; }
  // 앱 파일: 네트워크 우선(고친 내용 반영), 안 되면 저장본
  e.respondWith(fetch(e.request).then(r => {
    if (r.ok) { const cp = r.clone(); caches.open(SHELL).then(c => c.put(e.request, cp)); }
    return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('index.html'))));
});
