/**
 * Service Worker para Cowork Virtual 3D (PWA).
 * Cache estratégico: shell estática + assets 3D (GLB, texturas) + API responses.
 */

const CACHE_NAME = 'cowork3d-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
];

// Assets 3D grandes que queremos cachear agresivamente
const CACHEABLE_EXTENSIONS = ['.glb', '.gltf', '.png', '.jpg', '.webp', '.woff2'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Solo GET requests
  if (event.request.method !== 'GET') return;

  // No cachear API de Supabase realtime/auth
  if (url.pathname.includes('/rest/') || url.pathname.includes('/auth/') || url.pathname.includes('/realtime/')) return;

  // Cache-first para assets 3D (GLB, texturas) — son inmutables
  const isCacheableAsset = CACHEABLE_EXTENSIONS.some((ext) => url.pathname.endsWith(ext));

  if (isCacheableAsset) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Network-first para todo lo demás
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cachear solo respuestas exitosas de navigation/document
        if (response.ok && event.request.mode === 'navigate') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
