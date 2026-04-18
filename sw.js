/* ===== SBT Fantasy Football — Service Worker ===== */
const CACHE = 'sbt-v17';

const STATIC_ASSETS = [
  './leftnav.js',
  './leftnav.css',
  './manifest.json',
];

/* Install — cache only truly static assets (not HTML pages) */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

/* Activate — remove old caches */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* Fetch strategy:
   - .html pages   → network first (always get latest code)
   - data/*.json   → network first (always get latest data)
   - JS/CSS/images → cache first (stable assets, fast load)
*/
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);
  const isHtml = url.pathname.endsWith('.html') || url.pathname === '/' || url.pathname.endsWith('/');
  const isData = url.pathname.includes('/data/');

  if (isHtml || isData) {
    // Network first — always fresh, fall back to cache if offline
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
  } else {
    // Cache first for JS, CSS, images, fonts
    e.respondWith(
      caches.match(e.request)
        .then(cached => cached || fetch(e.request)
          .then(res => {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
            return res;
          })
        )
    );
  }
});
