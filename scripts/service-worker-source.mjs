export function serviceWorkerSource(version,urls){return `
const CACHE = 'aeroface-${version}';
const ASSETS = ${JSON.stringify(urls)};
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS.map(url => new Request(new URL(url, self.location.href), { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('aeroface-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    // Old cached HTML must not pin an old exporter while the user is online.
    if (event.request.mode === 'navigate') {
      try {
        const fresh = await fetch(event.request, { cache: 'no-store' });
        if (fresh.ok) return fresh;
      } catch {}
      const index = await cache.match(new URL('./index.html', self.location.href), { ignoreVary: true });
      if (index) return index;
    }
    const cached = await cache.match(event.request, { ignoreVary: true });
    if (cached) return cached;
    return fetch(event.request);
  })());
});
`;}
