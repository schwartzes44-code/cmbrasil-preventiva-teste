const CACHE = 'cmbrasil-preventiva-teste-login-fix-v2';
const CORE = ['./', './index.html', './styles.css?v=1', './app.js?v=1', './manifest.webmanifest', './icon.svg', './supabase-config.js?v=2', './auth.js?v=2', './login-controller.js?v=2'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('cmbrasil-preventiva') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(response => {
    if (response.ok) {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(e.request, copy));
    }
    return response;
  }).catch(() => caches.match(e.request).then(cached => cached || (e.request.mode === 'navigate' ? caches.match('./index.html') : Response.error()))));
});
