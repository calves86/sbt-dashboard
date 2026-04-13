/* ===== SBT Fantasy Football — Service Worker ===== */
const CACHE = 'sbt-v2';

const STATIC_ASSETS = [
  './dashboard.html',
  './matchup.html',
  './team.html',
  './standings.html',
  './transactions.html',
  './players.html',
  './trade.html',
  './playoff.html',
  './index.html',
  './mock-draft.html',
  './leftnav.js',
  './leftnav.css',
  './manifest.json',
];

/* Install — cache static shell */
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
   - data/*.json  → network first, fall back to cache (keep data fresh)
   - everything else → cache first, fall back to network
*/
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  if (url.pathname.includes('/data/')) {
    // Network first for data files
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
    // Cache first for static assets
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
