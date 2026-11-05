import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
async function walk(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) files.push(...await walk(`${dir}/${entry.name}`));
    else if (entry.name !== 'sw.js') files.push(`${dir}/${entry.name}`);
  }
  return files;
}
const files = await walk('dist');
const hash = createHash('sha256');
hash.update('aeroface-static-cache-v2');
for (const file of files.sort()) hash.update(await readFile(file));
const version = hash.digest('hex').slice(0, 12);
const urls = files.map(file => './' + file.slice(5));
await writeFile('dist/sw.js', `
const CACHE = 'aeroface-${version}';
const ASSETS = ${JSON.stringify(urls)};
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('aeroface-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    // Public immutable assets have no user-specific variants. Vite adds Vary: Origin.
    const cached = await cache.match(event.request, { ignoreVary: true });
    if (cached) return cached;
    if (event.request.mode === 'navigate') {
      const index = await cache.match(new URL('./index.html', self.location.href), { ignoreVary: true });
      if (index) return index;
    }
    return fetch(event.request);
  })());
});
`);
console.log(`Offline cache ${version}: ${files.length} static files. User photos are never cached.`);
