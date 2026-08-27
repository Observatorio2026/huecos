// Service worker mínimo: no cachea nada todavía, pero es necesario
// para que Chrome/Android ofrezca el botón "Instalar app".
self.addEventListener('install', function (event) {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  self.clients.claim();
});

self.addEventListener('fetch', function (event) {
  // Vacío a propósito por ahora: deja pasar todas las peticiones tal cual.
});
