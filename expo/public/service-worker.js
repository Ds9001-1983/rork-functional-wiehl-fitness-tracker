// Kill-switch SW: unregister self + purge caches, so old cached PWA installs
// release their grip. Browsers fetch this every time (nginx no-store).
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch {}
    try {
      await self.registration.unregister();
    } catch {}
    const allClients = await self.clients.matchAll({ type: 'window' });
    for (const client of allClients) {
      try { client.navigate(client.url); } catch {}
    }
  })());
});

self.addEventListener('fetch', () => {
  // pass-through — do not cache, do not intercept
});
