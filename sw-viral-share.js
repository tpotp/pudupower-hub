// Service Worker Share Target Interceptor (sw-viral-share.js)
// Recibe imágenes/audio compartidos desde el menú nativo de Android/iOS hacia Barsalitsuni
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method === 'POST' && url.pathname === '/share-target') {
    event.respondWith((async () => {
      try {
        const formData = await event.request.formData();
        const media = formData.get('media');
        const cache = await caches.open('pudu-share-target-v1');
        if (media && typeof media.arrayBuffer === 'function') {
          const buf = await media.arrayBuffer();
          await cache.put('/shared-media-latest', new Response(buf, {
            headers: { 'Content-Type': media.type || 'image/png', 'X-Shared-Name': media.name || 'pudu-share.png' }
          }));
        }
        return Response.redirect('/?shared=1&source=share_target', 303);
      } catch {
        return Response.redirect('/?shared=0', 303);
      }
    })());
  }
});
